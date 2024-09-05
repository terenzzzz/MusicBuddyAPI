## Installation
```sh
npm install
```

## Run service
```sh
node index.js
```

## .env
```sh
BASE_URL=http://0.0.0.0
PORT=6906
ENVIRONMENT=dev

#mongodb connections
#mongodb+srv://<username>:<password>@<host>/<database name>
# MONGO_HOST=musicbuddy.grxyfb1.mongodb.net
# MONGO_USER=terence592592
# MONGO_PASS=592592
# MONGO_DBNAME=MusicBuddyVue
# MONGO_CONNAME=mongodb


# deploy env
# MONGO_CONNECTION = "mongodb://root:592592@0.0.0.0:27017/MusicBuddyVue?authSource=admin" # Deploy
#SPOTIFY_REDIRECT_FRONT_END_URL="https://musicbuddy.fun/#/profile" # Deploy
#SPOTIFY_REDIRECT_URL="https://musicbuddy.fun:6907/api/spotifyCallback" # Deploy
#MODEL_API="https://terenzzzz.cn:5003" # Deploy


# Development env
MONGO_CONNECTION = "mongodb+srv://terence592592:592592@musicbuddy.grxyfb1.mongodb.net/MusicBuddyVue" # Development
#MONGO_CONNECTION = "mongodb://localhost:27017/MusicBuddyVue" # Development
SPOTIFY_REDIRECT_FRONT_END_URL="http://localhost:8080/#/profile" # Development
SPOTIFY_REDIRECT_URL="http://localhost:6906/api/spotifyCallback"# Development
MODEL_API="http://127.0.0.1:5002" # Development


SPOTIFY_CLIENT_ID="f85facb3c71b4098ac4802c900553be0"
SPOTIFY_CLIENT_SECRET="694f88e5b6814430a0daffa67bf5bf7e"
LASTFM_API_KEY = "ee33544ab78d90ee804a994f3ac302b8"
GENIUS_ACCESS_TOKEN="Bearer M6-CiaMAOEJUqhRdeSZixZKFRzVIxqjETACtMVVjXUqi-8ry4U2HnvDWSdHSqLR3"
```
