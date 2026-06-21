import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Poor Lighting', 'Isolated Area', 'Harassment Spot', 'Suspicious Activity', 'Road Construction/Obstacle']
  },
  severity: {
    type: String,
    required: true,
    enum: ['Low', 'Medium', 'High']
  },
  description: {
    type: String,
    required: true
  },
  reportedBy: {
    type: String,
    default: 'Anonymous'
  },
  reportedAt: {
    type: Date,
    default: Date.now
  }
});

const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);
export default Report;
