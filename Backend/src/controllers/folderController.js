const Folder = require('../models/Folder');
const File = require('../models/File');
const Activity = require('../models/Activity');
const quotaService = require('../services/quotaService');
const dedupService = require('../services/dedupService');

async function list(req, res, next) {
  try {
    const parentId = req.query.parent_id;
    const all = req.query.all === 'true';
    if (all) {
      const folders = await Folder.findByUser(req.userId);
      return res.json({ folders });
    }
    const folders = await Folder.findByUserAndParent(req.userId, parentId || null);
    res.json({ folders });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, parent_id } = req.body;
    const nameStr = name != null ? String(name).trim() : '';
    if (!nameStr) {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    if (parent_id) {
      const parent = await Folder.findById(parent_id);
      if (!parent || parent.user_id !== req.userId) {
        return res.status(404).json({ error: 'Parent folder not found' });
      }
    }
    const folder = await Folder.create({
      userId: req.userId,
      parentId: parent_id || null,
      name: nameStr,
    });
    await Activity.log({
      userId: req.userId,
      action: 'create_folder',
      resourceType: 'folder',
      resourceId: folder.id,
      details: { name: nameStr },
    });
    res.status(201).json(folder);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { name, parent_id } = req.body;
    const nameStr = name != null ? String(name).trim() : '';
    if (!nameStr) {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    if (parent_id != null && parent_id !== '') {
      const parent = await Folder.findById(parent_id);
      if (!parent || parent.user_id !== req.userId) {
        return res.status(404).json({ error: 'Parent folder not found' });
      }
    }
    const updated = await Folder.update(req.params.id, req.userId, {
      name: nameStr,
      ...(req.body.hasOwnProperty('parent_id') && { parentId: parent_id == null || parent_id === '' ? null : parent_id }),
    });
    if (!updated) return res.status(404).json({ error: 'Folder not found' });
    await Activity.log({
      userId: req.userId,
      action: 'update_folder',
      resourceType: 'folder',
      resourceId: updated.id,
      details: { name: nameStr, parent_id },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder || folder.user_id !== req.userId) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const files = await File.findByUserAndFolder(req.userId, folder.id, true);
    for (const f of files) {
      await quotaService.removeUsage(req.userId, f.size_bytes);
      await dedupService.releaseBlob(f.blob_id);
      await File.remove(f.id, req.userId);
    }

    await Folder.remove(req.params.id, req.userId);
    await Activity.log({
      userId: req.userId,
      action: 'delete_folder',
      resourceType: 'folder',
      resourceId: folder.id,
      details: { name: folder.name },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
