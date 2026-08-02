/* ===========================
   SLExam Pro - app.js
=========================== */

// Current Year
document.addEventListener("DOMContentLoaded", function () {

    const year = document.getElementById("year");

    if (year) {
        year.textContent = new Date().getFullYear();
    }

});


// Search Function
function searchCards() {

    let input = document.getElementById("searchInput");

    if (!input) return;

    let filter = input.value.toUpperCase();

    let cards = document.querySelectorAll(".card");

    cards.forEach(function(card){

        let text = card.innerText.toUpperCase();

        if(text.indexOf(filter) > -1){

            card.style.display="block";

        }

        else{

            card.style.display="none";

        }

    });

}
