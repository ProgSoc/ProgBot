# ProgBot

ProgBot is a Discord bot designed specifically for the Programmers' Society Discord server. It is written in TypeScript using the [NestJS](https://nestjs.com/) framework and the [Necord](https://necord.org/) library built on the [Discord.js](https://discord.js.org/#/) library.

## Hosting

ProgBot is currently able to be hosted through the docker image provided in this repository and the docker-compose file which includes addon services used to run the bot.

This includes:

- Redis for caching
- PostgreSQL for the database
- MeiliSearch for the search engine

## Planned Features

- [ ] Reputation system
- [ ] Member Verification
- [ ] Docs Search

## Contributing

This project is open to contributions and if you are interested in doing so please contact us on the Discord server.

### Debugging

To get a local instance of the bot running:
1. Create a Discord bot for testing from the [Discord developer portal](https://discord.com/developers/applications).
1. Create a `.env` file from the `.env.example` file and fill out each field following the instructions in the file.
1. Start the adjacent services using `docker-compose up --build`.
1. Install the Node dependencies and run the `dev` script with your preferred node package manager (e.g. `npm install` and `npm run dev`).

**Requirements:**
* Docker
* Docker Compose
* Node.js