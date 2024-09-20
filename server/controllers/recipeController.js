require('../models/database');
const { response } = require('express');
const Category = require('../models/Category');
const Recipe = require('../models/Recipe');
const User = require('../models/User'); 
const bcrypt = require('bcrypt');
const passport = require('passport');
const { sendWelcomeEmail } = require('../utils/mailer');
const fs = require('fs');
const path = require('path');

/**  
 * GET / 
 * Homepage
*/
exports.homepage = async (request, response) => {

    try {
        const limitNumber = 5
        const categories = await Category.find({}).limit(limitNumber)
        const latest = await Recipe.find({}).sort({ _id: -1 }).limit(limitNumber);

        const thai = await Recipe.find({ 'category': 'Thai' }).limit(limitNumber)
        const dessert = await Recipe.find({ 'category': 'Dessert' }).limit(limitNumber)
        const spanish = await Recipe.find({ 'category': 'Spanish' }).limit(limitNumber)
        const mexican = await Recipe.find({ 'category': 'Mexican' }).limit(limitNumber)
        const chinese = await Recipe.find({ 'category': 'Chinese' }).limit(limitNumber)
        const american = await Recipe.find({ 'category': 'American' }).limit(limitNumber)
        const indian = await Recipe.find({ 'category': 'Indian' }).limit(limitNumber)


        const food = { latest, thai, dessert, spanish, mexican, chinese, american, indian };
        response.render('index', { title: 'CookBookClub - Home', categories, food });
    } catch (error) {
        response.status(500).send({ message: error.message || "Error Occured" })
    }
}

/**  
 * GET /categories
 * Categories
*/
exports.exploreCategories = async (request, response) => {

    try {
        const limitNumber = 20
        const categories = await Category.find({}).limit(limitNumber)
        response.render('categories', { title: 'CookBookClub - Categories', categories });
    } catch (error) {
        response.status(500).send({ message: error.message || "Error Occured" })
    }
}

/**  
 * GET /categories/:id
 * Categoreis By Id
*/
exports.exploreCategoriesById = async (request, response) => {

    try {
        let categoryId = request.params.id
        const limitNumber = 20
        const categoryById = await Recipe.find({ 'category': categoryId }).limit(limitNumber)
        response.render('categories', { title: 'CookBookClub - Categories', categoryById });
    } catch (error) {
        response.status(500).send({ message: error.message || "Error Occured" })
    }
}


/**  
 * GET /recipe/:id 
 * Recipe
*/
exports.exploreRecipe = async (request, response) => {

    try {
        let recipeID = request.params.id;
        const recipe = await Recipe.findById(recipeID)
        if (!recipe) {
            return res.status(404).send('Recipe not found');
        }

        response.render('recipe', { title: 'CookBookClub - Recipe', recipe, userEmail: request.user ? request.user.email : null });
    } catch (error) {
        response.status(500).send({ message: error.message || "Error Occured" })
    }
}

/**
 * GET /recipe/:id/edit
 * Update Recipe
 */
exports.updateRecipe = async (request, response) => {
    try {
        let recipeID = request.params.id;
        let recipe = await Recipe.findById(recipeID)
        let infoErrorObj = request.flash('infoErrors')
        let infoSubmitObj = request.flash('infoSubmit')
        if (!recipe) {
            return response.status(404).send('Recipe not found');
        }
        response.render('updateRecipe', { title: "CookBookClub - Update Recipe", recipe, infoErrorObj, infoSubmitObj });
    } catch (error) {
        console.error(error);
        response.status(500).send('Server error');
    }
}

/**
 * POST /recipe/:id
 * Updated Recipe
 */
exports.handleUpdateRecipe = async (request, response) => {
    const id = request.params.id;
    let newImageName = request.body.existingImage; // Use the existing image if no new image is uploaded
    console.log("Existing Image:", newImageName);
    console.log('Request body:', request.body);
    console.log('Files in request:', request.files);
    if (request.files && request.files.image) {
        const uploadedImage = request.files.image;
        console.log('Uploaded Image:', uploadedImage);
        newImageName = Date.now() + '-' + uploadedImage.name;
        const uploadPath = path.resolve('C://Users//LENOVO//OneDrive//Desktop//CookBookClub//public//uploads//' + newImageName);

        try {
            await uploadedImage.mv(uploadPath);
            console.log("File uploaded successfully");

            // Remove the old image if a new image is uploaded
            if (request.body.existingImage) {
                const oldImagePath = path.resolve('C://Users//LENOVO//OneDrive//Desktop//CookBookClub//public//uploads//' + request.body.existingImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath); // Delete the old image
                }
            }
        } catch (error) {
            console.error("Error handling file upload: ", error);
            return response.status(500).send('Server Error');
        }
    }

    try {
        const updatedRecipe = await Recipe.findByIdAndUpdate(id, {
            name: request.body.name,
            description: request.body.description,
            ingredients: request.body.ingredients,
            category: request.body.category,
            image: newImageName
        }, { new: true, runValidators: true });
        console.log("Updated Recipe:", updatedRecipe);

        if (!updatedRecipe) {
            return response.status(404).send('Recipe not found');
        }

        request.flash('success', 'Recipe updated successfully');

        response.redirect(`/recipe/${updatedRecipe._id}`);
    } catch (error) {
        console.error("Error updating recipe: ", error);
        response.status(500).send('Server Error');
    }
};



/**
 * GET /delete
 * Delete Recipe
 */
exports.deleteRecipe = async (request, response) => {
    try {
        let id = request.params.id;

        // Find the recipe and delete it
        const result = await Recipe.findByIdAndDelete(id);

        // If the recipe has an associated image, check if the image file exists and delete it
        if (result && result.image != "") {
            const imagePath = 'C://Users//LENOVO//OneDrive//Desktop//CookBookClub//public//uploads//' + result.image;
            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                    console.log('Image deleted successfully.');
                } catch (error) {
                    console.log('Error deleting image:', error);
                }
            } else {
                console.log('Image not found:', imagePath);
            }
        }

        // Set a flash message for success
        request.flash('success', 'Recipe deleted successfully');

        // Redirect to the home page
        response.redirect("/");

    } catch (error) {
        // Handle errors that occur during the deletion process
        console.log('Error deleting recipe:', error);
        request.flash('error', 'Error deleting the recipe');
        response.redirect('/');
    }
};

/**  
 * POST /search
 * Search
*/
exports.searchRecipe = async (request, response) => {
    try {
        let searchTerm = request.body.searchTerm;
        let recipe = await Recipe.find({ $text: { $search: searchTerm, $diacriticSensitive: true } });
        response.render('search', { title: 'CookBookClub - Search', recipe: recipe });  // Render the search view with recipe data
    } catch (error) {
        response.status(500).send({ message: error.message || "Error Occured" });
    }
};


/**  
 * GET /explore-latest
 * Explore-Latest
*/
exports.exploreLatest = async (request, response) => {
    try {
        const limitNumber = 5;
        const recipe = await Recipe.find({}).sort({ _id: -1 }).limit(limitNumber)
        response.render('explore-latest', { title: 'CookBookClub - Explore Latest', recipe })
    } catch (error) {
        response.status(500).send({ message: error.message || 'Error Occured' })
    }
}


/**  
 * GET /explore-random
 * Explore-Random as JSON
*/
exports.exploreRandom = async (request, response) => {
    try {
        let count = await Recipe.find().countDocuments()
        let random = Math.floor(Math.random() * count)
        let recipe = await Recipe.findOne().skip(random).exec()
        // response.json(recipe)
        response.render('explore-random', { title: 'CookBookClub - Explore Random', recipe })
    } catch (error) {
        response.status(500).send({ message: error.message || 'Error Occured' })
    }
}


/**  
 * GET /submit-recipe
 * Submit-Recipe
*/
exports.submitRecipe = async (request, response) => {
    const infoErrorObj = request.flash('infoErrors')
    const infoSubmitObj = request.flash('infoSubmit')
    response.render('submit-recipe', { title: 'CookBookClub - Submit Recipe', infoErrorObj, infoSubmitObj })
}


/**  
 * POST /submit-recipe
 * Submit-Recipe
*/
exports.submitRecipeOnPost = async (request, response) => {
    console.log("Recipe submission started");  

    try {
        let imageUploadFile;
        let uploadPath;
        let newImageName;

        if (!request.files || Object.keys(request.files).length === 0) {
            console.log('No Files were uploaded.');
        } else {
            imageUploadFile = request.files.image;
            newImageName = Date.now() + imageUploadFile.name;
            uploadPath = require('path').resolve('./') + '/public/uploads/' + newImageName;

            // Log file upload action
            console.log("Uploading file: ", newImageName);

            await new Promise((resolve, reject) => {
                imageUploadFile.mv(uploadPath, (err) => {
                    if (err) {
                        console.log("File upload error: ", err);
                        reject(err);
                    } else {
                        console.log("File uploaded successfully");
                        resolve();
                    }
                });
            });
        }

        // Save the new recipe to the database
        const newRecipe = new Recipe({
            name: request.body.name,
            description: request.body.description,
            email: request.body.email,
            ingredients: request.body.ingredients,
            category: request.body.category,
            image: newImageName
        });

        await newRecipe.save();  
        console.log("Recipe saved successfully");

        request.flash('infoSubmit', 'Recipe has been added.');

        console.log("Redirecting to /submit-recipe");
        return response.redirect('/submit-recipe');  // Ensure only one response is sent

    } catch (error) {
        console.log("Error occurred: ", error.message || error);

        request.flash('infoError', error.message || 'Error Occurred');

        console.log("Redirecting to /submit-recipe after error");
        return response.redirect('/submit-recipe');
    }
};


/**
 * GET /login
 * Login Page
 */
exports.loginPage = (req, res) => {
    res.render('login', { layout: false }); 
};

/**
 * POST /login
 * Handel Login Page
 */
exports.loginUser = (req, res, next) => {
    console.log(res.locals.redirectUrl)
    req.flash('success', 'You are successfully logged in to your account')
    res.redirect(res.locals.redirectUrl)
};

/**
 * GET /logout
 */
exports.logoutUser = (request, response) => {
    request.logout(error => {
        if (error) return next(error);

        request.flash('success', 'You are successfully logged out of your account')
        response.redirect('/');
    })
}

/**
 * GET /signup
 * Signup Page
 */
exports.signupPage = (req, res) => {
    res.render('signup', { layout: false }); 
};

/**
 * POST /signup
 * Handle Signup
 */
exports.signupUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Check if the email already exists

        const existingEmail = await User.findOne({ email: email });
        console.log(existingEmail)
        if (existingEmail) {
            req.flash('error', 'Email is already registered.');
            return res.redirect('/signup');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name,
            email: email,
            password: hashedPassword,
        });

        await newUser.save();
        req.login(newUser, async error => {
            if (error) {
                return next(error)
            }
            // Send the welcome email
            await sendWelcomeEmail(email, name);

            req.flash('success', 'Account created successfully! Please check your email.');
            res.redirect('/');
        })


    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};

/** 
 * GET /aboutUs
 * About Us 
 */
exports.aboutUsPage = (req, res) => {
    res.render('aboutus');
};


/** 
 * Dummy Category Data
 */

async function insertDummyCategoryData() {
    try {
        await Category.insertMany([
            { name: 'Indian', image: 'indian-food.jpg' },
            { name: 'Thai', image: 'thai-food.jpg' },
            { name: 'American', image: 'american-food.jpg' },
            { name: 'Chinese', image: 'chinese-food.jpg' },
            { name: 'Mexican', image: 'mexican-food.jpg' },
            { name: 'Spanish', image: 'spanish-food.jpg' }
        ])
    }
    catch (error) {
        console.log("error : " + error);
    }
}
// insertDummyCategoryData()


/** 
 * Dummy Recipe Data
 */
async function insertDummyRecipeData() {
    try {
        await Recipe.insertMany([
            {
                name: "Spicy Thai Curry",
                description: "A flavorful Thai curry made with coconut milk and a medley of vegetables and aromatic herbs. Perfect for spice lovers!",
                email: "mohitpandya078@gmail.com",
                ingredients: [
                    "Coconut milk",
                    "Red curry paste",
                    "Chicken",
                    "Basil",
                    "Lime leaves",
                    "Fish sauce",
                    "Coriander"
                ],
                category: "Thai",
                image: "Spicy Thai Curry.jpg"
            },
            {
                name: "American Cheeseburger",
                description: "A mouthwatering cheeseburger with a juicy beef patty, gooey cheddar, and fresh toppings like lettuce and tomato.",
                email: "shahdarsh2304@gmail.com",
                ingredients: [
                    "Ground beef",
                    "Cheddar cheese",
                    "Lettuce",
                    "Tomato",
                    "Buns",
                    "Ketchup",
                    "Onion rings"
                ],
                category: "American",
                image: "American Cheeseburger.jpg"
            },
            {
                name: "Kung Pao Chicken",
                description: "A fiery stir-fried dish packed with chicken, crunchy peanuts, and chili peppers, all coated in a savory soy sauce.",
                email: "mohitpandya078@gmail.com",
                ingredients: [
                    "Chicken",
                    "Peanuts",
                    "Bell peppers",
                    "Chili peppers",
                    "Soy sauce",
                    "Ginger",
                    "Garlic"
                ],
                category: "Chinese",
                image: "Kung Pao Chicken.jpg"
            },
            {
                name: "Mexican Tacos",
                description: "Authentic tacos with seasoned beef, zesty salsa, and creamy guacamole, served in warm tortillas.",
                email: "mohitpandya078@gmail.com",
                ingredients: [
                    "Tortillas",
                    "Ground beef",
                    "Salsa",
                    "Guacamole",
                    "Cilantro",
                    "Lime",
                    "Jalapenos"
                ],
                category: "Mexican",
                image: "Mexican Tacos.jpg"
            },
            {
                name: "Indian Butter Chicken",
                description: "A creamy, rich Indian dish with tender chicken, butter, tomato, and a blend of spices for a delightful meal.",
                email: "mohitpandya078@gmail.com",
                ingredients: [
                    "Chicken",
                    "Tomato sauce",
                    "Cream",
                    "Butter",
                    "Garam masala",
                    "Cilantro",
                    "Ginger"
                ],
                category: "Indian",
                image: "Indian Butter Chicken.jpg"
            },
            {
                name: "Paella Valenciana",
                description: "A Spanish delicacy with saffron-infused rice, succulent seafood, chicken, and an array of vegetables.",
                email: "mohitpandya078@gmail.com",
                ingredients: [
                    "Saffron",
                    "Rice",
                    "Shrimp",
                    "Chicken",
                    "Bell peppers",
                    "Green beans",
                    "Olive oil",
                    "Chorizo"
                ],
                category: "Spanish",
                image: "Paella Valenciana.jpg"
            },
            {
                name: "Chinese Steak Tofu Stew",
                description: "A savory stew combining tender steak and tofu simmered in a flavorful broth with aromatic spices.",
                email: "shahdarsh2304@gmail.com",
                ingredients: ["Steak", "Tofu", "Soy sauce", "Ginger", "Garlic", "Spring onions"],
                category: "Chinese",
                image: "chinese-steak-tofu-stew.jpg"
            },
            {
                name: "Crab Cakes",
                description: "Delicately seasoned crab cakes with a crispy outer shell and tender crab meat inside, perfect as an appetizer.",
                email: "shahdarsh2304@gmail.com",
                ingredients: ["Crab meat", "Breadcrumbs", "Egg", "Mayonnaise", "Dijon mustard"],
                category: "American",
                image: "crab-cakes.jpg"
            },
            {
                name: "Grilled Lobster Rolls",
                description: "Delicious grilled lobster served in a soft roll, topped with butter and a hint of lemon for a coastal treat.",
                email: "shahdarsh2304@gmail.com",
                ingredients: ["Lobster", "Bread rolls", "Butter", "Lemon", "Chives"],
                category: "American",
                image: "grilled-lobster-rolls.jpg"
            },
            {
                name: "Key Lime Pie",
                description: "A tangy and refreshing key lime pie with a graham cracker crust, perfect for a sweet and zesty treat.",
                email: "shahdarsh2304@gmail.com",
                ingredients: ["Key lime juice", "Sweetened condensed milk", "Egg yolks", "Graham crackers"],
                category: "American",
                image: "key-lime-pie.jpg"
            },
            {
                name: "Southern Fried Chicken",
                description: "Crispy and flavorful Southern fried chicken, marinated in buttermilk and spices for that authentic taste.",
                email: "shahdarsh2304@gmail.com",
                ingredients: ["Chicken", "Flour", "Buttermilk", "Spices"],
                category: "American",
                image: "southern-fried-chicken.jpg"
            },
            {
                name: "Spring Rolls",
                description: "Crispy spring rolls filled with fresh vegetables and herbs, perfect as a light and healthy appetizer.",
                email: "shahdarsh2304@gmail.com",
                ingredients: ["Rice paper", "Lettuce", "Carrots", "Cucumber"],
                category: "Chinese",
                image: "spring-rolls.jpg"
            },
            {
                name: "Stir Fried Vegetables",
                description: "A quick and healthy stir-fry with a variety of fresh vegetables tossed in soy sauce.",
                email: "shahdarsh2304@gmail.com",
                ingredients: ["Bell peppers", "Broccoli", "Carrots", "Soy sauce"],
                category: "Chinese",
                image: "stir-fried-vegetables.jpg"
            },
            {
                name: "Thai Chinese Inspired Pinch Salad",
                description: "A refreshing and flavorful salad inspired by both Thai and Chinese cuisine, with a light dressing.",
                email: "mohitpandya078@gmail.com",
                ingredients: ["Lettuce", "Cucumber", "Herbs", "Dressing"],
                category: "Thai",
                image: "thai-chinese-inspired-pinch-salad.jpg"
            },
            {
                name: "Thai Green Curry",
                description: "A fragrant and spicy Thai green curry with tender chicken and vegetables in a rich coconut milk sauce.",
                email: "mohitpandya078@gmail.com",
                ingredients: ["Green curry paste", "Coconut milk", "Chicken", "Vegetables"],
                category: "Thai",
                image: "thai-green-curry.jpg"
            },
            {
                name: "Thai Inspired Vegetable Broth",
                description: "A light and flavorful vegetable broth infused with lemongrass and ginger for a refreshing soup.",
                email: "mohitpandya078@gmail.com",
                ingredients: ["Vegetable stock", "Lemongrass", "Ginger", "Mushrooms"],
                category: "Thai",
                image: "thai-inspired-vegetable-broth.jpg"
            },
            {
                name: "Thai Red Chicken Soup",
                description: "A rich and spicy Thai red chicken soup, bursting with flavors from red curry paste and coconut milk.",
                email: "mohitpandya078@gmail.com",
                ingredients: ["Red curry paste", "Coconut milk", "Chicken", "Vegetables"],
                category: "Thai",
                image: "thai-red-chicken-soup.jpg"
            },
            {
                name: "Thai Style Mussels",
                description: "Succulent mussels cooked in a fragrant Thai broth with coconut milk, herbs, and a touch of chili.",
                email: "mohitpandya078@gmail.com",
                ingredients: ["Mussels", "Coconut milk", "Thai herbs", "Chili"],
                category: "Thai",
                image: "thai-style-mussels.jpg"
            },
            {
                name: "Veggie Pad Thai",
                description: "A delicious vegetarian Pad Thai, featuring stir-fried rice noodles, fresh vegetables, and crunchy peanuts.",
                email: "mohitpandya078@gmail.com",
                ingredients: ["Rice noodles", "Vegetables", "Peanuts", "Tamarind paste"],
                category: "Thai",
                image: "veggie-pad-thai.jpg"
            }
        ]);
        console.log("Data inserted successfully.");
    } catch (error) {
        console.error("Error inserting data:", error);
    }
}
// insertDummyRecipeData();