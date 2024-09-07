const { addDays } = require("date-fns");
const express = require("express");
const {open} = require("sqlite");
const path = require("path");
const sqlite3 = require("sqlite3");
const { create } = require("domain");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

const authenticateToken = (request,response,next) => {
  const authHeaders = request.headers["authorization"];
  let jwtToken;
  if (authHeaders !== undefined ){
      jwtToken = authHeaders.split(" ")[1];
  }
  if (jwtToken === undefined){
    response.status(401);
    response.send("Missing JWT Token");
  }else{
    jwt.verify(jwtToken,"MY_SECRET_KEY",async (error,payload)=>{
      if(error){
        response.status(401);
        response.send("Invalid JWT Token");
      }else{
        request.username = payload.username;
        next();
      }
    })
  }
}

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
    //{root:__dirname} command gives this file path and combine with page.html //
    response.sendFile("./page.html", {root: __dirname});
});

//get books from database API
app.get('/books/',authenticateToken, async (request,response)=>{
  const {limit=2,offset=3,search_q="",order='book_id',order_by='asc'} = request.query;
  const getBooksQuery = `
      select * 
      from book
      where title like '%${search_q}%'
      order by ${order_by} ${order}
      limit ${limit} offset ${offset};
      `;

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

//Register user API
app.post('/users/',async (request,response)=>{
    const {username,name,password,gender,location} = request.body;
    const hashedPassword = await bcrypt.hash(password,10);
    const selectUserQuery = `
        select * from user
        where username = '${username}';
        `
    const dbUser = await db.get(selectUserQuery);
    if(dbUser === undefined){
        const createUserQuery = `
            insert into user(username,name,password,gender,location)
            values('${username}','${name}','${hashedPassword}','${gender}','${location}');`
        await db.run(createUserQuery);
        response.send("User Created Sucessfully");
    }else{
        response.status(400);
        response.send("Username already exists")
    }
})

//Login user API
app.post('/login/',async (request,response)=>{
    const {username,password} = request.body;
    const selectUserQuery = `
        select * from user
        where username = '${username}';
        `
    const dbUser = await db.get(selectUserQuery);
    if(dbUser === undefined){
        response.status(400);
        response.send("Invalid User");
    }else{
        const isPasswordMatched = await bcrypt.compare(password,dbUser.password);
        if(isPasswordMatched === true){
            const payload = {username:username};
            const jwtToken = jwt.sign(payload,"MY_SECRET_KEY")
            response.send({jwtToken});
           // response.send("Login Success");
        }else{
            response.status(400);
            response.send("Invalid Password");
        }

    }
})

//API for update password
app.put('/change-password', async (request, response) => {
    const {username, oldPassword, newPassword} = request.body
    const userNameCheckQuery = `
          select * from user
          where username = '${username}';`
    const dbUser = await db.get(userNameCheckQuery)
    if (dbUser === undefined) {
      response.status(400)
      response.send('Invalid user')
    } else {
      const userCurrentPassword = `
              select * from user
              where username = '${username}';
          `
      const dbCurrentPassword = await db.get(userCurrentPassword)
      const isCorrectPassword = await bcrypt.compare(
        oldPassword,
        dbCurrentPassword.password,
      )
  
      if (isCorrectPassword) {
        if (newPassword.length < 5) {
          response.status(400)
          response.send('Password is too short')
        } else {
          const hashedNewPassword = await bcrypt.hash(newPassword, 10)
          const updatePasswordQuery = `
                          update user
                          set password = '${hashedNewPassword}'
                          where username = '${username}';
                      `
          await db.run(updatePasswordQuery)
          response.send('Password updated')
        }
      } else {
        response.status(400)
        response.send('Invalid current password')
      }
    }
  })

  //API for register user
  app.post('/register', async (request, response) => {
    const {username, name, password, gender, location} = request.body
    const userNameCheckQuery = `
          select * from user
          where username = '${username}';`
    const dbResponse = await db.get(userNameCheckQuery)
    if (dbResponse === undefined) {
      if (password.length < 5) {
        response.status(400)
        response.send('Password is too short')
      } else {
        const hashedPassword = await bcrypt.hash(password, 10)
        const registerUserQuery = `
                  insert into user(username,name,password,gender,location)
                  values('${username}','${name}','${hashedPassword}','${gender}','${location}')`
        await db.run(registerUserQuery)
        response.send('User created successfully')
      }
    } else {
      response.status(400)
      response.send('User already exists')
    }
  })
  
  //Get user profile API
  app.get('/profile/',authenticateToken, async (request, response)=>{
      const {username} = request;
      const getUserProfileQuery = `
      select * from user
      where username = '${username}';
      `
      const userProfile = await db.get(getUserProfileQuery);
      response.send(userProfile);
  })