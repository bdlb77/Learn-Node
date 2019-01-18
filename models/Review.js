const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;


const reviewSchema = new Schema({
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must apply the author'
  },
  store:{
    type: mongoose.Schema.ObjectId,
    ref: 'Store',
    required: 'Must apply a store!'
  },
  text:{
    type: String,
    required: 'Please leave a comment!'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: 'Please add a valid rating!'
  },
  created: {
    type: Date,
    default: Date.now
  }

})
function autoPopulate(next){
  this.populate('author');
  next();
}

reviewSchema.pre('find', autoPopulate);
reviewSchema.pre('findOne', autoPopulate);

module.exports = mongoose.model('Review', reviewSchema);
