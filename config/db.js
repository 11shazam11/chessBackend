import dotenv from 'dotenv';
dotenv.config();
import pg from "pg";


const {Pool} = pg;

const db = new Pool({
    connectionString: process.env.DB_URL
})

export default db;