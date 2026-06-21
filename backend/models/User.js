import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  emergencyContacts: [
    {
      name: { type: String, required: true },
      phone: { type: String, required: true }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Avoid model recompilation errors in hot-reload environments
const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
