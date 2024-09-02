const { addDays } = require("date-fns");
const express = require("express");
const {open} = require("sqlite");
const path = require("path");
const sqlite3 = require("sqlite3");

console.log(addDays(new Date(2023,8,30),11));

const app = express();
app.use(express.json());

//initializing database and server

const dbPath = path.join(__dirname,"goodreads.db");
let db = null;

const instalizeDBAndServer = async ()=>{
    
    try{
        db = await open({
            filename:dbPath,
            driver:sqlite3.Database,
        });

        app.listen(3000, ()=>{
            console.log("Server Running at http://localhost:3000/");
        });
        
    }catch(error){
        console.log(`DB Error: ${error.message}`);
        process.exit(1);
    }

    
}

instalizeDBAndServer();

//hello world API
app.get('/',(request,response)=>{
    //console.log(request);
    //console.log(response);
    response.send("Hello World!");
});

//date API
app.get('/date',(request,response)=>{
    //console.log(request);
    let date = new Date();
    //console.log(response);
    response.send(`Today's date is: ${date}`);
});

//HTML page API
app.get('/page',(request,response)=>{
    //console.log(request);
    //console.log(response);

    //{root:__dirname} command gives this file path and combine with page.html //
    response.sendFile("./page.html", {root: __dirname});
});

//get books from database API
app.get('/books/', async (request, response)=>{
    const getBooksQuery = `
        select * 
        from book
        order by book_id`;

    const bookArray = await db.all(getBooksQuery);
    response.send(bookArray);
});

//get book from database API
app.get('/books/:bookId', async (request, response)=>{
    const {bookId} = request.params;
    
    const getBookQuery = `
    select *
    from book
    where book_id = ${bookId}`;

    const book = await db.get(getBookQuery);
    response.send(book);
});

//add book API using post method
app.post('/books/', async (request, response) =>{
    const bookDetails = request.body;
    const {
        title,
        authorId,
        rating,
        ratingCount,
        reviewCount,
        description,
        pages,
        dateOfPublication,
        editionLanguage,
        price,
        onlineStores,    
    } = bookDetails;
    addBookQuery = `
    INSERT INTO
      book (title,author_id,rating,rating_count,review_count,description,pages,date_of_publication,edition_language,price,online_stores)
    VALUES
      (
        '${title}',
         '${authorId}',
         '${rating}',
         '${ratingCount}',
         '${reviewCount}',
        '${description}',
         '${pages}',
        '${dateOfPublication}',
        '${editionLanguage}',
         '${price}',
        '${onlineStores}'
      );`;

    const dbResponse = await db.run(addBookQuery);
    const bookId = dbResponse.lastID;
    console.log(dbResponse);
    response.send({bookId:bookId});  //sending in json format
});

//update book API using put method
app.put('/books/:bookId/', async (request, response) => {
    const bookId = request.params;
    const bookDetails = request.body;
    
    const {
        title,
        authorId,
        rating,
        ratingCount,
        reviewCount,
        description,
        pages,
        dateOfPublication,
        editionLanguage,
        price,
        onlineStores,    
    } = bookDetails;

    const updateBookQuery = `
        update book
        set 
        title='${title}',
        author_id=${authorId},
        rating=${rating},
        rating_count=${ratingCount},
        review_count=${reviewCount},
        description='${description}',
        pages=${pages},
        date_of_publication='${dateOfPublication}',
        edition_language='${editionLanguage}',
        price= ${price},
        online_stores='${onlineStores}'

        where book_id = '${bookId}'
    `
    await db.run(updateBookQuery);
    response.send("Book Updated Successfully")
});

//delete API
app.delete('/books/:bookId/',async (request,response)=>{
    const bookId = request.params;
    const deleteBookQuery = `
    delete from book
    where book_id = '${bookId}'
    `
    await db.run(deleteBookQuery);
    response.send("Book Deleted Successfully")
})
