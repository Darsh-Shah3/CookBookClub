let addIngredientsBtn = document.getElementById('addIngredientsBtn')
let ingredientList = document.querySelector('.ingredientList')
let ingredientDiv = document.querySelectorAll('.ingredientDiv')[0]

if (addIngredientsBtn)
    addIngredientsBtn.addEventListener('click', () => {
        let newIngredients = ingredientDiv.cloneNode(true);
        let input = newIngredients.getElementsByTagName('input')[0];
        input.value = "";
        ingredientList.appendChild(newIngredients);

    })

document.addEventListener('DOMContentLoaded', function () {
    var toastElList = [].slice.call(document.querySelectorAll('.toast'))
    var toastList = toastElList.map(function (toastEl) {
        return new bootstrap.Toast(toastEl)
    })
    toastList.forEach(toast => toast.show())
}
)