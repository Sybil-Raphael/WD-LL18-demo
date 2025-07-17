// --- DOM elements ---
const randomBtn = document.getElementById("random-btn");
const recipeDisplay = document.getElementById("recipe-display");

// Get the Remix button, theme selector, and output box from the DOM
const remixBtn = document.getElementById("remix-btn");
const remixThemeSelect = document.getElementById("remix-theme");
const remixOutput = document.getElementById("remix-output");

// This function creates a list of ingredients for the recipe from the API data
// It loops through the ingredients and measures, up to 20, and returns an HTML string
// that can be used to display them in a list format
// If an ingredient is empty or just whitespace, it skips that item 
function getIngredientsHtml(recipe) {
  let html = "";
  for (let i = 1; i <= 20; i++) {
    const ing = recipe[`strIngredient${i}`];
    const meas = recipe[`strMeasure${i}`];
    if (ing && ing.trim()) html += `<li>${meas ? `${meas} ` : ""}${ing}</li>`;
  }
  return html;
}

// This function displays the recipe on the page
let currentRecipe = null;

// This function displays the recipe on the page
function renderRecipe(recipe) {
  currentRecipe = recipe; // Save for remixing
  recipeDisplay.innerHTML = `
    <div class="recipe-title-row">
      <h2>${recipe.strMeal}</h2>
    </div>
    <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" />
    <h3>Ingredients:</h3>
    <ul>${getIngredientsHtml(recipe)}</ul>
    <h3>Instructions:</h3>
    <p>${recipe.strInstructions.replace(/\r?\n/g, "<br>")}</p>
    <button id="save-recipe-btn" class="accent-btn">
      <span class="material-symbols-outlined icon-btn">bookmark_add</span>
      Save Recipe
    </button>
  `;
  // Add event listener for Save Recipe button
  const saveBtn = document.getElementById("save-recipe-btn");
  saveBtn.addEventListener("click", function() {
    saveRecipe(recipe.strMeal);
  });
}

// This function gets a random recipe from the API and shows it
async function fetchAndDisplayRandomRecipe() {
  recipeDisplay.innerHTML = "<p>Loading...</p>"; // Show loading message
  try {
    // Fetch a random recipe from the MealDB API
    const res = await fetch('https://www.themealdb.com/api/json/v1/1/random.php'); // Replace with the actual API URL
    const data = await res.json(); // Parse the JSON response
    const recipe = data.meals[0]; // Get the first recipe from the response
    renderRecipe(recipe); // Render the recipe on the page

  } catch (error) {
    recipeDisplay.innerHTML = "<p>Sorry, couldn't load a recipe.</p>";
  }
}

// This function sends the current recipe and remix theme to OpenAI's API.
// The API responds with a fun, creative remix of the recipe.
// The remix is then shown in the remix-output box.
async function remixRecipeWithAI(recipe, theme) {
  // Show a friendly loading message while waiting for the AI
  remixOutput.innerHTML = "<p>Remixing your recipe... Hang tight!</p>";

  try {
    // Create a prompt for the AI using the recipe JSON and the selected theme
    const prompt = `
Remix this recipe in a "${theme}" style. Highlight any changed ingredients or instructions. Make it short, fun, and doable!

Recipe JSON:
${JSON.stringify(recipe, null, 2)}
`;

    // Send the prompt to OpenAI's chat completions API using async/await
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Use the API key from secrets.js
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: "You are a creative chef remixing recipes for beginners." },
          { role: "user", content: prompt }
        ],
        max_tokens: 400
      })
    });

    // Parse the response from OpenAI
    const data = await response.json();

    // Get the AI's reply, or show a friendly error if missing
    const aiRemix = data.choices && data.choices[0] && data.choices[0].message.content
      ? data.choices[0].message.content
      : "Sorry, couldn't get a remix from the AI.";

    // Show the remixed recipe in the remix-output box
    remixOutput.innerHTML = `<h3>Remixed Recipe:</h3><p>${aiRemix.replace(/\n/g, "<br>")}</p>`;

  } catch (error) {
    // If something goes wrong, show a friendly error message
    remixOutput.innerHTML = "<p>Oops! Something went wrong while remixing your recipe.</p>";
  }
}

// Helper function to get saved recipes from localStorage
function getSavedRecipes() {
  const saved = localStorage.getItem("savedRecipes");
  return saved ? JSON.parse(saved) : [];
}

// Helper function to save a recipe name to localStorage
function saveRecipe(name) {
  const saved = getSavedRecipes();
  if (!saved.includes(name)) {
    saved.push(name);
    localStorage.setItem("savedRecipes", JSON.stringify(saved));
  }
  renderSavedRecipes();
}

// Helper function to delete a recipe from localStorage
function deleteRecipe(name) {
  const saved = getSavedRecipes().filter(n => n !== name);
  localStorage.setItem("savedRecipes", JSON.stringify(saved));
  renderSavedRecipes();
}

// Fetch and display a recipe by name from MealDB
async function fetchAndDisplayRecipeByName(name) {
  recipeDisplay.innerHTML = "<p>Loading saved recipe...</p>";
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(name)}`);
    const data = await res.json();
    if (data.meals && data.meals.length > 0) {
      renderRecipe(data.meals[0]);
    } else {
      recipeDisplay.innerHTML = "<p>Sorry, couldn't find that recipe.</p>";
    }
  } catch (error) {
    recipeDisplay.innerHTML = "<p>Sorry, couldn't load the saved recipe.</p>";
  }
}

// Render the list of saved recipes (each name is clickable, with a delete button)
function renderSavedRecipes() {
  const savedRecipesContainer = document.getElementById("saved-recipes-container");
  const savedRecipesList = document.getElementById("saved-recipes-list");
  const saved = getSavedRecipes();
  if (saved.length === 0) {
    savedRecipesContainer.style.display = "none";
    savedRecipesList.innerHTML = "";
    return;
  }
  savedRecipesContainer.style.display = "block";
  savedRecipesList.innerHTML = "";
  saved.forEach(name => {
    const li = document.createElement("li");
    li.className = "saved-recipe-item";
    // Make the recipe name clickable
    const span = document.createElement("span");
    span.textContent = name;
    span.style.cursor = "pointer";
    span.addEventListener("click", function() {
      fetchAndDisplayRecipeByName(name);
    });
    // Create the delete button
    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", function(e) {
      e.stopPropagation(); // Prevent triggering the recipe load
      deleteRecipe(name);
    });
    li.appendChild(span);
    li.appendChild(delBtn);
    savedRecipesList.appendChild(li);
  });
}


// --- Event listeners ---

// When the button is clicked, get and show a new random recipe
randomBtn.addEventListener("click", fetchAndDisplayRandomRecipe);

// When the page loads, show a random recipe right away and render saved recipes
document.addEventListener("DOMContentLoaded", function() {
  fetchAndDisplayRandomRecipe();
  renderSavedRecipes();
});

// Add event listener for the Remix button
remixBtn.addEventListener("click", function() {
  // Clear previous remix output if any
  remixOutput.innerHTML = "";
  if (currentRecipe && remixThemeSelect.value) {
    remixRecipeWithAI(currentRecipe, remixThemeSelect.value);
  } else {
    remixOutput.innerHTML = "<p>Please load a recipe and select a remix theme.</p>";
  }
});