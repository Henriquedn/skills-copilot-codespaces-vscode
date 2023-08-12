// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');
const axios = require('axios');

// Create express app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create comments object
const commentsByPostId = {};

// Create endpoint to get all comments for a given post
app.get('/posts/:id/comments', (req, res) => {
  const postId = req.params.id;
  const comments = commentsByPostId[postId] || [];
  res.send(comments);
});

// Create endpoint to create a new comment for a given post
app.post('/posts/:id/comments', async (req, res) => {
  const postId = req.params.id;
  const { content } = req.body;
  const commentId = randomBytes(4).toString('hex');

  // Get comments for a given post
  const comments = commentsByPostId[postId] || [];

  // Add new comment to the comments array
  comments.push({ id: commentId, content, status: 'pending' });

  // Update comments for a given post
  commentsByPostId[postId] = comments;

  // Emit event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId, status: 'pending' },
  });

  // Send response
  res.status(201).send(comments);
});

// Create endpoint to receive events from the event bus
app.post('/events', async (req, res) => {
  const { type, data } = req.body;

  // If event type is CommentModerated
  if (type === 'CommentModerated') {
    // Get data from event
    const { postId, id, status, content } = data;

    // Get comments for a given post
    const comments = commentsByPostId[postId];

    // Get comment with the given id
    const comment = comments.find((comment) => comment.id === id);

    // Update status of comment
    comment.status = status;

    // Emit event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: { id, status,