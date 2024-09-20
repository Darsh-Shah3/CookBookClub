const express = require('express')
const router = express.Router()
const passport = require('passport')
const recipeController = require('../controllers/recipeController');
const { authenticationCheck,saveRedirectUrl} = require('../middleware/authantication');



// Home page 
router.get('/', recipeController.homepage); 

// Route for the About Us page
router.get('/aboutUs', recipeController.aboutUsPage);

// Particular Recipe
router.get('/recipe/:id', recipeController.exploreRecipe);

// Particular recipe update
router.get('/recipe/:id/edit', recipeController.updateRecipe);

// handle update recipe
router.post('/recipe/:id', recipeController.handleUpdateRecipe);

// Particular recipe delete
router.post('/recipe/:id/delete',recipeController.deleteRecipe)

// categories
router.get('/categories', recipeController.exploreCategories);

// particular categories
router.get('/categories/:id', recipeController.exploreCategoriesById)

// search
router.post('/search', recipeController.searchRecipe)

// explore latest
router.get('/explore-latest', recipeController.exploreLatest);

// explore random
router.get('/explore-random', recipeController.exploreRandom);

// submit 
router.get('/submit-recipe', authenticationCheck,recipeController.submitRecipe);

// handle submit
router.post('/submit-recipe', authenticationCheck,recipeController.submitRecipeOnPost);


// Login Routes
router.get('/login' ,recipeController.loginPage);
router.post('/login', saveRedirectUrl,passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true
}), recipeController.loginUser);

// Signup Routes
router.get('/signup', recipeController.signupPage);
router.post('/signup', recipeController.signupUser);

// Logout Route
router.get('/logout', recipeController.logoutUser);

// Profile Page
router.get('/profile', recipeController.profileGet)
router.post('/profile', authenticationCheck,saveRedirectUrl,recipeController.profile);


module.exports = router;  