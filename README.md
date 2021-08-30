# WEB322_Asgn
An emulation of the Airbnb website. Allows visitors to view rooms and users to book rooms. Created using HTML5, CSS3, JavaScript, Node.js, Express, Handlebars, and Bootstrap. User and room information is stored on a Postgre database. The web application is deployed on Heroku.
# Heroku URL: https://rocky-beyond-90282.herokuapp.com/

# Overview
The website contains a home page, room listings page, room description page, room creation page, room editing page, dashboard page, and sign up page. The home page contains a non functional booking search form, a promotional section, and an information section. The room listings page displays cards for each room listing stored in the database. Clicking on a room card display will take you to a page with the room description. If you’re logged in, you can book the room. If you’re an admin, there will be options to edit and remove the room as well.
Visitors can sign up as regular users by navigating to the Sign Up page and filling out the registration form. When the user logs in they are redirected to their dashboard page. If the user is an admin, they will be redirected to an admin dashboard and will have the option to create a room.
