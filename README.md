# Bike Shop Map

This project displays a google map with custom markers for any bike shops within visible range. Bike shops can be filtered by whether or not they are currently open, relative elevation to other visible bike shops, and Google customer rating. Additionally, text search will narrow results on bike shop name and address.

This project was developed in conjunction with the Full Stack Web Developer Nanodegree at [Udacity.com](https://www.udacity.com/course/full-stack-web-developer-nanodegree--nd004).

This project is currently live on its [Github Page](https://davidhousedev.github.io/Bike-Shop-Map-Udacity/)

# Libraries and APIs

### Libraries
* __[KnockoutJS](http://knockoutjs.com/)__ - Javascript framework for handling automatic UI refreshing
* __[Twitter Bootstrap](https://v4-alpha.getbootstrap.com/)__ - CSS Framework used to create responsive application UI
* __[jQuery](https://jquery.com/)__ - DOM manipulation library
* __[FuseJS](http://fusejs.io/)__ - Lightweight fuzzy-search library. Used to search bike shop results.

### APIs
* __[Google Maps Javascript API](https://developers.google.com/maps/documentation/javascript/)__ - Creates bike shop map and handles retrieval of shop and elevation information
* __[New York Times Article Search API](https://developer.nytimes.com/article_search_v2.json)__ - Displays articles from New York Times relevant to bicycling

### File Directory
* __js__
    * __app.js__ - Primary JavaScript file
* __css__
    * __styles.css__ - Primary CSS file
* __index.html__ - Primary application file, open this in your web browser to start the application
* __bower.json__ - Bower package manager configuration file
* __bower_components__ - Stores application dependencies



# Requirements:
The only requirement for this app is a modern web browser. The JavaScript used for this project utilizes features that are not supported on legacy browsers.

# Installation Instructions
1. Clone the repository to your local machine
2. Open `index.html` in a modern web browser of your choice

# Author

David A. House

davidhousedev@gmail.com

@davidhousedev


# Contact
For support and other inquiries, please contact me via e-mail or on Twitter
* Email: davidhousedev@gmail.com
* Twitter: @davidhousedev


# LICENSE
Copyright (c) 2016 David Alexander House

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

All data derived from Google and New York Times APIs subject to original respective copyright.