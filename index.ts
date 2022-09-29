import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import env from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

env.config();

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(cors());

const port = Number(process.env.PORT);

const SECRET = process.env.SECRET!;

function getToken(id: number) {
  return jwt.sign({ id }, SECRET, { expiresIn: "2h" });
}

async function getCurrentUser(token: string) {
  const decodedData = jwt.verify(token, SECRET);
  const user = await prisma.user.findUnique({
    where: {
      // @ts-ignore
      id: Number(decodedData.id),
    },
    include: {
      posts: true,
    },
  });
  return user;
}

app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({
    include: {
      posts: true,
    },
  });
  res.send(users);
});

app.get("/users/:id", async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      posts: true,
    },
  });
  res.send(user);
});

app.post("/signup", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            email: req.body.email,
          },
          {
            name: req.body.name,
          },
        ],
      },
    });
    if (users.length > 0) {
      return res.status(401).send({ message: "User already exists" });
    } else {
      const user = await prisma.user.create({
        data: {
          email: req.body.email,
          name: req.body.name,
          password: bcrypt.hashSync(req.body.password, 10),
          phoneNumber: req.body.phoneNumber
        },
        include: {
          posts: true,
        },
      });
      const token = getToken(user.id);
      res.send({user, token});
    }
  } catch (error) {
    //@ts-ignore
    res.status(451).send({ error: error.message });
  }
});

app.post("/login", async (req, res) => {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        {
          email: req.body.login,
        },
        {
          name: req.body.login,
        },
      ],
    },
    include: {
      posts: true,
    },
  })

  const user = users[0];

  if(user && bcrypt.compareSync(req.body.password, user.password)) {
    const token = getToken(user.id);
    res.send({ user, token });
  } else {
    res.status(401).send({ message: "Invalid credentials. Email or password is incorrect!" });
  }
});

app.get('/validate', async (req, res) => {
    try {
        if(req.headers.authorization){
            const user = await getCurrentUser(req.headers.authorization);
            //@ts-ignore
            const token = getToken(user.id);
            res.send({user, token});
        } else {
            res.status(401).send({error: "No token provided"})
        }
    } catch (error) {
        //@ts-ignore
        res.status(404).send({ error: error.message });
    }
})

app.get("/posts", async (req, res) => {
  const posts = await prisma.post.findMany({
    include: { user: true, tags: { select: { name: true } } },
  });
  res.send(posts);
});

app.get("/posts/:id", async (req, res) => {
  const post = await prisma.post.findUnique({
    where: {
      id: Number(req.params.id),
    },
    include: { user: true, tags: true },
  });
  res.send(post);
});

app.post("/posts", async (req, res) => {
  try {
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
            id: Number(req.body.userId),
          },
        },
        tags: {
          connectOrCreate: req.body.tags.map((tag: string) => {
            return {
              where: { name: tag },
              create: { name: tag },
            };
          }),
        },
      },
      include: { user: true, tags: true },
    });
    res.send(post);
  } catch (error) {
    // @ts-ignore
    res.status(404).send({ error: error.message });
  }
});

app.get("/savedPosts", async (req, res) => {
  const posts = await prisma.post.findMany({
    where: {
      saved: true,
    },
    include: { user: true, tags: true },
  });
  res.send(posts);
})

app.patch("/posts/:id", async (req, res) => {
  try {
  const post = await prisma.post.update({
    where: {
      id: Number(req.params.id)
    },
    data: {
      saved: req.body.saved,
      user: {
        connect: {
          id: Number(req.body.userId)
        },
      }
    },
  })
  res.send(post);
} catch (error) {
  // @ts-ignore
  res.status(404).send({ error: error.message });
}
})

app.post("/tags", async (req, res) => {
  const tag = await prisma.tag.create({
    data: {
      name: req.body.name,
      posts: {
        connect: req.body.posts.map((post: number) => {
          return {
            id: post,
          };
        }),
      },
    },
  });
  res.send(tag);
});

app.listen(port, () => {
  console.log(`Server running on port http://localhost:${port}`);
});
