const express = require('express')
const router = express.Router()
const passport = require('passport')
const recipeController = require('../controllers/recipeController');
const { authenticationCheck,saveRedirectUrl } = require('../middleware/authantication');


// App Routes

router.get('/', recipeController.homepage); 
router.get('/recipe/:id', recipeController.exploreRecipe);

router.get('/recipe/:id/edit', recipeController.updateRecipe);
router.post('/recipe/:id', recipeController.handleUpdateRecipe);

router.get('/categories', recipeController.exploreCategories);
router.get('/categories/:id', recipeController.exploreCategoriesById)
router.post('/search', recipeController.searchRecipe)
router.get('/explore-latest', recipeController.exploreLatest);
router.get('/explore-random', recipeController.exploreRandom);
router.get('/submit-recipe', recipeController.submitRecipe);
router.post('/submit-recipe', authenticationCheck,recipeController.submitRecipeOnPost);


// Login and Signup Routes
router.get('/login' ,recipeController.loginPage);
router.post('/login', saveRedirectUrl,passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true
}), recipeController.loginUser);
router.get('/signup', recipeController.signupPage);
router.post('/signup', recipeController.signupUser);
router.get('/logout', recipeController.logoutUser);


module.exports = router;  