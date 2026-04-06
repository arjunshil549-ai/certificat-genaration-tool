const TemplateModel = require('../models/Template');

const createTemplate = async (req, res, next) => {
  try {
    const { name, description, config, is_active } = req.body;
    if (!name || !config) {
      return res.status(400).json({ success: false, message: 'name and config are required' });
    }
    const template = TemplateModel.create({ name, description, config, is_active });
    res.status(201).json({ success: true, data: template });
  } catch (err) { next(err); }
};

const getTemplates = async (req, res, next) => {
  try {
    const templates = TemplateModel.findAll();
    res.json({ success: true, data: templates });
  } catch (err) { next(err); }
};

const getTemplate = async (req, res, next) => {
  try {
    const template = TemplateModel.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (err) { next(err); }
};

const updateTemplate = async (req, res, next) => {
  try {
    const template = TemplateModel.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    const updated = TemplateModel.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

const deleteTemplate = async (req, res, next) => {
  try {
    const template = TemplateModel.findById(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    TemplateModel.delete(req.params.id);
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) { next(err); }
};

module.exports = { createTemplate, getTemplates, getTemplate, updateTemplate, deleteTemplate };
