document.addEventListener("DOMContentLoaded", function () {
    // Hide scrollbar during loader display
    document.body.classList.add("no-scroll");

    // Display loader for 2 seconds
    setTimeout(function () {
        // Hide loader
        document.getElementById("loader").style.display = "none";

        // Show main content with fade-in effect
        const mainContent = document.getElementById("main-content");
        mainContent.classList.remove("hidden");
        mainContent.classList.add("fade-in");

        // Remove no-scroll to allow scrolling
        document.body.classList.remove("no-scroll");
    }, 4000); // Adjust as needed
});


