const mongoose = require('mongoose');

const tfidfSimilaritySchema = new mongoose.Schema({
    track: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Track',
      required: true
    },
    topsimilar: {
        type: [
            {
                track: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Track',
                    required: true
                },
                value: {
                    type: Number,
                    required: true
                },
            }
        ], 
        required: true
    }
  }, { timestamps: true });

module.exports = {
    TfidfSimilarity: mongoose.model('TfidfSimilarity', tfidfSimilaritySchema)
}