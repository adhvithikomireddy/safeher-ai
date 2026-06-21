import mongoose from 'mongoose';

const commuteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for guest mode
  },
  sourceAddress: {
    type: String,
    required: true
  },
  destinationAddress: {
    type: String,
    required: true
  },
  safetyScore: {
    type: Number,
    required: true
  },
  routeCoords: {
    type: [[Number]], // Array of [lat, lng]
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'sos'],
    default: 'active'
  },
  elapsedTimeSec: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  }
});

const Commute = mongoose.models.Commute || mongoose.model('Commute', commuteSchema);
export default Commute;
