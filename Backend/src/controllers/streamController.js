const express = require('express');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');
const { STREAMS } = require('../config/storage');

const router = express.Router();

router.get('/:fileId/playlist.m3u8', async (req, res, next) => {
  try {
    const file = await File.findById(req.params.fileId, req.userId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const playlistPath = path.join(STREAMS, req.params.fileId, 'playlist.m3u8');
    const resolvedPath = path.resolve(playlistPath);
    const relativeToStreams = path.relative(STREAMS, resolvedPath);
    if (relativeToStreams.startsWith('..') || path.isAbsolute(relativeToStreams)) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'Stream not ready. Video may still be processing.' });
    }
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.sendFile(resolvedPath);
  } catch (err) {
    next(err);
  }
});

const segmentHandler = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.fileId, req.userId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const segmentPath = path.join(STREAMS, req.params.fileId, req.params.segment);
    const resolvedPath = path.resolve(segmentPath);
    const relativeToStreams = path.relative(STREAMS, resolvedPath);
    if (relativeToStreams.startsWith('..') || path.isAbsolute(relativeToStreams)) {
      return res.status(400).json({ error: 'Invalid segment' });
    }
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    res.sendFile(resolvedPath);
  } catch (err) {
    next(err);
  }
};

router.get('/:fileId/:segment', segmentHandler);

module.exports = router;
