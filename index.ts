import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import env from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

env.config();

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(cors());

const port = Number(process.env.PORT)

const SECRET = process.env.SECRET!;

function getToken(id: number){
    return jwt.sign({id}, SECRET, {expiresIn: '2h'});
}

async function getCurrentUser(token: string){
    const decodedData = jwt.verify(token, SECRET);
    const user = await prisma.user.findUnique({
        where: {
            // @ts-ignore
            id: Number(decodedData.id)
        },
        include: {
            posts: true
        }
    })
}

app.get('/posts', async (req, res) => {
    const posts = await prisma.post.findMany({
        include: {user: true, tags: true}
    })
    res.send(posts);
})

app.get('/posts/:id', async (req, res) => {
    const post = await prisma.post.findUnique({
        where: {
            id: Number(req.params.id)
        },
        include: {user: true, tags: true}
    })
    res.send(post);
})

app.post('/posts', async (req, res) => {
    const post = await prisma.post.create({
        data: {
            title: req.body.title,
            image: req.body.image,
            content: req.body.content,
            saved: false,
            toSell: req.body.toSell,
            toBuy: req.body.toBuy,
            price: Number(req.body.price),
            user: {
                connect: {
                    id: Number(req.body.userId)
                }
            },
            tags: {
                
            }
            
        },
        include: {user: true, tags: true}
    })
    res.send(post);
})

app.post('/tags', async (req, res) => {
    const tag = await prisma.tag.create({
        data: {
            name: req.body.name,
            posts: {
                connectOrCreate
            }
        }
    })
    res.send(tag);
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
})