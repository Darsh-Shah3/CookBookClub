require('../models/database');
const { response } = require('express');
const Category = require('../models/Category');
const Recipe = require('../models/Recipe');
const User = require('../models/User'); // Ensure User model is imported
const bcrypt = require('bcrypt');
const passport = require('passport');
const { sendWelcomeEmail } = require('../utils/mailer');
const fs = require('fs');
const path=require('path');

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
exports.handleUpdateRecipe = async (req, res) => {
    const id = req.params.id;
    let newImageName = req.body.existingImage; // Use the existing image if no new image is uploaded
    console.log("Existing Image:", newImageName);
    console.log('Request body:', req.body);
    console.log('Files in request:', req.files);
    if (req.files&&req.files.image) {
        const uploadedImage = req.files.image;
        console.log('Uploaded Image:', uploadedImage);
        newImageName = Date.now() + '-' + uploadedImage.name;
        const uploadPath = path.resolve('C://Users//LENOVO//OneDrive//Desktop//CookBookClub//public//uploads//' + newImageName);

        try {
            await uploadedImage.mv(uploadPath);
            console.log("File uploaded successfully");

            // Remove the old image if a new image is uploaded
            if (req.body.existingImage) {
                const oldImagePath = path.resolve('C://Users//LENOVO//OneDrive//Desktop//CookBookClub//public//uploads//' + req.body.existingImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath); // Delete the old image
                }
            }
        } catch (error) {
            console.error("Error handling file upload: ", error);
            return res.status(500).send('Server Error');
        }
    }

    try {
        const updatedRecipe = await Recipe.findByIdAndUpdate(id, {
            name: req.body.name,
            description: req.body.description,
            ingredients: req.body.ingredients,
            category: req.body.category,
            image: newImageName
        }, { new: true, runValidators: true });
        console.log("Updated Recipe:", updatedRecipe);

        if (!updatedRecipe) {
            return res.status(404).send('Recipe not found');
        }

        req.flash('success', 'Recipe updated successfully');

        res.redirect(`/recipe/${updatedRecipe._id}`);
    } catch (error) {
        console.error("Error updating recipe: ", error);
        res.status(500).send('Server Error');
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
    console.log("Recipe submission started");  // Log start of the request

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

        await newRecipe.save();  // Ensure the recipe is saved
        console.log("Recipe saved successfully");

        // Set success flash message
        request.flash('infoSubmit', 'Recipe has been added.');

        // Redirect after successful submission
        console.log("Redirecting to /submit-recipe");
        return response.redirect('/submit-recipe');  // Ensure only one response is sent

    } catch (error) {
        console.log("Error occurred: ", error.message || error);

        // Set error flash message
        request.flash('infoError', error.message || 'Error Occurred');

        // Redirect in case of an error
        console.log("Redirecting to /submit-recipe after error");
        return response.redirect('/submit-recipe');
    }
};


/**
 * GET /login
 * Login Page
 */
exports.loginPage = (req, res) => {
    res.render('login', { layout: false }); // Make sure there's a corresponding login.ejs file
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
    res.render('signup', { layout: false }); // Make sure there's a corresponding signup.ejs file
};

/**
 * POST /signup
 * Handle Signup
 */
exports.signupUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Check if the username or email already exists

        const existingEmail = await User.findOne({ email: email });
        console.log(existingEmail)
        if (existingEmail) {
            req.flash('error', 'Email is already registered.');
            return res.redirect('/signup');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = new User({
            name: name,
            email: email,
            password: hashedPassword,
        });

        // Save the new user to the database
        await newUser.save();
        req.login(newUser, async error => {
            if (error) {
                return next(error)
            }
            // Send the welcome email
            await sendWelcomeEmail(email, name); // Send the welcome email here

            req.flash('success', 'Account created successfully! Please check your email.');
            res.redirect('/');
        })


    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};


// async function updateRecipe(){
//     try {
//         const response = await Recipe.updateOne({name:'New Recipe'},{name:'New Recipe Updated'})
//         response.n; // Number of documents matched
//         response.nModified;// Number of documents modified
//     } catch (error) {
//         console.log(error);
//     }
// }
// updateRecipe()


// async function deleteRecipe(){
//     try {
//         await Recipe.deleteOne({name:'New Recipe Updated'})
//         response.n; // Number of documents matched
//         response.nModified;// Number of documents modified
//     } catch (error) {
//         console.log(error);
//     }
// }
// updateRecipe()




// async function insertDummyCategoryData(){
//     try{
//         await Category.insertMany([
//             {name:'Thai',image:'thai-food.jpg'},
//             {name:'American',image:'american-food.jpg'},
//             {name:'Chinese',image:'chinese-food.jpg'},
//             {name:'Mexican',image:'mexican-food.jpg'},
//             {name:'Indian',image:'indian-food.jpg'},
//             {name:'Spanish',image:'spanish-food.jpg'}
//           ])
//     }
//     catch(error){
//         console.log("error : "+error);
//     }
// }

// insertDummyCategoryData()


// async function insertDummyRecipeData() {
//     try {
//         await Recipe.insertMany([
//             {
//                 name: "Spicy Thai Curry",
//                 description: "A traditional Thai curry made with coconut milk, red curry paste, and a variety of vegetables and proteins.",
//                 email: "chef.thai@example.com",
//                 ingredients: [
//                     "Coconut milk",
//                     "Red curry paste",
//                     "Chicken",
//                     "Basil",
//                     "Lime leaves",
//                     "Fish sauce"
//                 ],
//                 category: "Thai",
//                 image: "Spicy Thai Curry.jpg"
//             },
//             {
//                 name: "American Cheeseburger",
//                 description: "A classic cheeseburger with a juicy beef patty, melted cheddar cheese, lettuce, tomato, and a toasted bun.",
//                 email: "burgerking@example.com",
//                 ingredients: [
//                     "Ground beef",
//                     "Cheddar cheese",
//                     "Lettuce",
//                     "Tomato",
//                     "Buns",
//                     "Ketchup"
//                 ],
//                 category: "American",
//                 image: "American Cheeseburger.jpg"
//             },
//             {
//                 name: "Kung Pao Chicken",
//                 description: "A spicy, stir-fried Chinese dish made with chicken, peanuts, vegetables, and chili peppers.",
//                 email: "kungpao.master@example.com",
//                 ingredients: [
//                     "Chicken",
//                     "Peanuts",
//                     "Bell peppers",
//                     "Chili peppers",
//                     "Soy sauce",
//                     "Ginger"
//                 ],
//                 category: "Chinese",
//                 image: "Kung Pao Chicken.jpg"
//             },
//             {
//                 name: "Mexican Tacos",
//                 description: "Traditional Mexican tacos filled with seasoned beef, fresh salsa, and guacamole.",
//                 email: "taco.loco@example.com",
//                 ingredients: [
//                     "Tortillas",
//                     "Ground beef",
//                     "Salsa",
//                     "Guacamole",
//                     "Cilantro",
//                     "Lime"
//                 ],
//                 category: "Mexican",
//                 image: "Mexican Tacos.jpg"
//             },
//             {
//                 name: "Indian Butter Chicken",
//                 description: "A rich, creamy Indian dish made with chicken, tomato sauce, cream, and a blend of traditional spices.",
//                 email: "indian.spice@example.com",
//                 ingredients: [
//                     "Chicken",
//                     "Tomato sauce",
//                     "Cream",
//                     "Butter",
//                     "Garam masala",
//                     "Cilantro"
//                 ],
//                 category: "Indian",
//                 image: "Indian Butter Chicken.jpg"
//             },
//             {
//                 name: "Paella Valenciana",
//                 description: "A traditional Spanish rice dish made with saffron, seafood, chicken, and a variety of vegetables.",
//                 email: "paella.master@example.com",
//                 ingredients: [
//                     "Saffron",
//                     "Rice",
//                     "Shrimp",
//                     "Chicken",
//                     "Bell peppers",
//                     "Green beans",
//                     "Olive oil"
//                 ],
//                 category: "Spanish",
//                 image: "Paella Valenciana.jpg"
//             },
//             {
//                 name: "Chinese Steak Tofu Stew",
//                 description: "A flavorful stew with steak and tofu cooked in a savory sauce.",
//                 email: "example@domain.com",
//                 ingredients: ["steak", "tofu", "soy sauce", "ginger", "garlic"],
//                 category: "Chinese",
//                 image: "chinese-steak-tofu-stew.jpg"
//             },
//             {
//                 name: "Chocolate Banoffee Whoopie Pies",
//                 description: "Delicious whoopie pies filled with chocolate and banoffee.",
//                 email: "example@domain.com",
//                 ingredients: ["flour", "cocoa powder", "banoffee", "chocolate"],
//                 category: "Dessert",
//                 image: "chocolate-banoffe-whoopie-pies.jpg"
//             },
//             {
//                 name: "Crab Cakes",
//                 description: "Crispy and flavorful crab cakes perfect for any occasion.",
//                 email: "example@domain.com",
//                 ingredients: ["crab meat", "breadcrumbs", "egg", "mayonnaise"],
//                 category: "American",
//                 image: "crab-cakes.jpg"
//             },
//             {
//                 name: "Grilled Lobster Rolls",
//                 description: "Tender lobster meat grilled and served in a delicious roll.",
//                 email: "example@domain.com",
//                 ingredients: ["lobster", "bread rolls", "butter", "lemon"],
//                 category: "American",
//                 image: "grilled-lobster-rolls.jpg"
//             },
//             {
//                 name: "Key Lime Pie",
//                 description: "A tangy and sweet key lime pie with a graham cracker crust.",
//                 email: "example@domain.com",
//                 ingredients: ["key lime juice", "sweetened condensed milk", "egg yolks", "graham crackers"],
//                 category: "American",
//                 image: "key-lime-pie.jpg"
//             },
//             {
//                 name: "Southern Fried Chicken",
//                 description: "Classic southern fried chicken with a crispy, flavorful coating.",
//                 email: "example@domain.com",
//                 ingredients: ["chicken", "flour", "buttermilk", "spices"],
//                 category: "American",
//                 image: "southern-fried-chicken.jpg"
//             },
//             {
//                 name: "Spring Rolls",
//                 description: "Fresh and crispy spring rolls filled with vegetables and herbs.",
//                 email: "example@domain.com",
//                 ingredients: ["rice paper", "lettuce", "carrots", "cucumber"],
//                 category: "Chinese",
//                 image: "spring-rolls.jpg"
//             },
//             {
//                 name: "Stir Fried Vegetables",
//                 description: "A quick and healthy stir-fry with a mix of fresh vegetables.",
//                 email: "example@domain.com",
//                 ingredients: ["bell peppers", "broccoli", "carrots", "soy sauce"],
//                 category: "Chinese",
//                 image: "stir-fried-vegetables.jpg"
//             },
//             {
//                 name: "Thai Chinese Inspired Pinch Salad",
//                 description: "A refreshing salad with Thai and Chinese influences.",
//                 email: "example@domain.com",
//                 ingredients: ["lettuce", "cucumber", "herbs", "dressing"],
//                 category: "Thai",
//                 image: "thai-chinese-inspired-pinch-salad.jpg"
//             },
//             {
//                 name: "Thai Green Curry",
//                 description: "A spicy and aromatic green curry with vegetables and meat.",
//                 email: "example@domain.com",
//                 ingredients: ["green curry paste", "coconut milk", "chicken", "vegetables"],
//                 category: "Thai",
//                 image: "thai-green-curry.jpg"
//             },
//             {
//                 name: "Thai Inspired Vegetable Broth",
//                 description: "A light and flavorful vegetable broth with Thai flavors.",
//                 email: "example@domain.com",
//                 ingredients: ["vegetable stock", "lemongrass", "ginger", "mushrooms"],
//                 category: "Thai",
//                 image: "thai-inspired-vegetable-broth.jpg"
//             },
//             {
//                 name: "Thai Red Chicken Soup",
//                 description: "A spicy and creamy red chicken soup with Thai spices.",
//                 email: "example@domain.com",
//                 ingredients: ["red curry paste", "coconut milk", "chicken", "vegetables"],
//                 category: "Thai",
//                 image: "thai-red-chicken-soup.jpg"
//             },
//             {
//                 name: "Thai Style Mussels",
//                 description: "Mussels cooked in a fragrant Thai-style broth.",
//                 email: "example@domain.com",
//                 ingredients: ["mussels", "coconut milk", "Thai herbs", "chili"],
//                 category: "Thai",
//                 image: "thai-style-mussels.jpg"
//             },
//             {
//                 name: "Veggie Pad Thai",
//                 description: "A vegetarian version of the classic Pad Thai noodle dish.",
//                 email: "example@domain.com",
//                 ingredients: ["rice noodles", "vegetables", "peanuts", "tamarind paste"],
//                 category: "Thai",
//                 image: "veggie-pad-thai.jpg"
//             }
//         ]);
//         console.log("Data inserted successfully.");
//     } catch (error) {
//         console.error("Error inserting data:", error);
//     }
// }

// insertDummyRecipeData();
