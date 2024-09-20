const mongoose = require('mongoose')
const validator = require('validator')

const recipeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: 'This field is required'
    },
    description: {
        type: String,
        required: 'This field is required'
    }, 
    email: {
        type: String,
        required: 'This field is required',
        validate: {
            validator: (v) => { return validator.isEmail(v); },
            message: `This is not a valid email address!`
        }
    },
    ingredients: {
        type: Array,
        required: 'This field is required'
    },
    category: {
        type: String,
        enum: ['Thai', 'American', 'Chinese', 'Mexican', 'Indian', 'Spanish','Dessert'],
        required: 'This field is required'
    },
    image: {
        type: String,
        required:false
    },
    time:{
        type:Date,
        default: Date.now(),
        required:false
    }
})

recipeSchema.index({name:'text',description:'text'})

// text searches across all string fields in the documents
recipeSchema.index({"$**":'text'})


module.exports = mongoose.model('Recipe', recipeSchema); 