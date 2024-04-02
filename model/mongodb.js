const mongoose = require('mongoose');
const MongoStore = require('connect-mongo')
require('dotenv').config()


/* Schemas */
const {Artist} = require("./schema/artist");
const {Tag} = require("./schema/tag");
const {Track} = require("./schema/track");
const {User} = require("./schema/user");
const {PlayList} = require("./schema/playList");
const {PlayListTrack} = require("./schema/playListTrack");
const track = require('./schema/track');


/* Connection Properties */
const MONGO_HOST = process.env.MONGO_HOST || "localhost";
const MONGO_USER = process.env.MONGO_USER || "admin";
const MONGO_PASS = process.env.MONGO_PASS;
const MONGO_DBNAME = process.env.MONGO_DBNAME || "test";
const MONGO_CONNNAME = process.env.MONGO_CONNNAME || "mongodb";

/* Connection String */
const connectionString = `mongodb+srv://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}/${MONGO_DBNAME}?retryWrites=true&w=majority`;

/* Variables */
let connected = false;

mongoose.connect(connectionString);

const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', async () => {
    console.log(`Connected to ${MONGO_CONNNAME}`);
    connected = true;
});

/* Session Storage */
let store;
if(connected){
    // Use Session schema from connect-mongo which aligns with express-session setup.
    store = new MongoStore.create({
        client: db,
        dbName: process.env.MONGO_DBNAME,
        collection: 'sessions',
        expires: 1000 * 60 * 60 * 48,
        crypto: {
            secret: process.env.STORE_SECRET || "secret",
        }
    });
}

/* PlayList Function */
const addPlayList = async (playList) => {
    try {
        let newPlayList = PlayList({
            name: playList.name,
            description: playList.description,
            cover: playList.cover,
            user: playList.user
        })
        return await newPlayList.save()
    } catch (error) {
        console.log(error);
    }
}

const addPlayListTrack = async (playListTrack) => {
    try {
        let newPlayListTrack = PlayListTrack({
            playList: playListTrack.playList,
            track: playListTrack.track,
            user: playListTrack.user
        })
        return await newPlayListTrack.save()
    } catch (error) {
        console.log(error);
    }
}

const deletePlayListTracks = async (user,playList,track) => {
    try {
        return await PlayListTrack.deleteOne({user: user, playList:playList,track:track})
    } catch (error) {
        console.log(error);
    }
}

const getPlayListTracks = async (user, playList) => {
    try {
        const playListTracks = await PlayListTrack.find({user: user, playList:playList}).populate("track")
        const tracksArray = playListTracks.map(item => item.track);
        return tracksArray;
    } catch (error) {
        console.log(error);
    }
}

const getPlayLists = async (user_id) => {
    try {
        return await PlayList.find({user: user_id})
    } catch (error) {
        console.log(error);
    }
}

const getPlayList = async (playList_id) => {
    try {
        return await PlayList.findOne({_id: playList_id})
    } catch (error) {
        console.log(error);
    }
}

/* User Function */
const getUser = async (id) => {
    try {
        const user = await User.findOne({_id: id});
        const { password, ...userWithoutPassword } = user.toObject();

        return userWithoutPassword;
    } catch (error) {
        console.log(error);
    }
};

const getUsers = async () => {
    try {
        return await User.find();
    } catch (error) {
        console.log(error);
    }
};

const getUserByEmail = async (email) => {
    try {
        return await User.findOne({email: email});
    } catch (error) {
        console.log(error);
    }
};

const addUser = async (user) => {
    try {
        const newUser = User(
            {
                name: user.name,
                email: user.email,
                password: user.password,
                avatar: user.avatar,
            }
        )
        return await newUser.save()
    } catch (error) {
        console.log(error);
    }
};

/* Track Function */
const getTracks = async () => {
    try {
        return await Track.find().populate("artist").populate("tags").populate("tags.tag").limit(50);
    } catch (error) {
        console.log(error);
    }
};

const getTracksByArtist = async (artist) => {
    try {
        return await Track.find({artist: artist}).populate("artist").populate("tags").populate("tags.tag").limit(50);
    } catch (error) {
        console.log(error);
    }
};

const getRandomTracks = async () => {
    // Update Algorithm
    try {
        // 随机获取20个文档
        const randomTracks = await Track.aggregate([{ $sample: { size: 20 } }]);
        
        // 填充关联的数据
        const populatedTracks = await Track.populate(randomTracks, { path: "artist" });
        await Track.populate(populatedTracks, { path: "tags" });
        await Track.populate(populatedTracks, { path: "tags.tag" });

        return populatedTracks;
    } catch (error) {
        console.log(error);
    }
};

/* Artist Function */
const getArtist = async (id) => {
    // Update Algorithm
    try {
        return await Artist.findOne({_id:id}).populate("tags").populate("tags.tag");
    } catch (error) {
        console.log(error);
    }
};

const getRandomArtists = async () => {
    // Update Algorithm
    try {
        // 随机获取20个文档
        const randomArtists = await Artist.aggregate([{ $sample: { size: 20 } }]);
        
        // 填充关联的数据
        const populatedArtists = await Artist.populate(randomArtists, { path: "artist" });
        await Track.populate(populatedArtists, { path: "tags" });
        await Track.populate(populatedArtists, { path: "tags.tag" });

        return populatedArtists;

    } catch (error) {
        console.log(error);
    }
};

/* Data Prepare Function */
const addArtist = async (artist)=>{
    try {
        var tags = JSON.parse(artist.tags)

        const newArtist = new Artist({
            id_string: artist.artist_id,
            name: artist.name,
            tags: [],
            familiarity: artist.familiarity,
            hotness: artist.hotness,
            ne_artist_id: artist.ne_artist_id,
            avatar: artist.avatar,
            summary: artist.summary,
            published: artist.published
        });

        if(tags != null){
            for (const tagInfo of tags) {
                const tag = await Tag.findOne({ name: tagInfo.name });
                if (tag) {
                    newArtist.tags.push({
                        tag: tag._id,
                        count: tagInfo.count
                    });
                }
            }
        }
        console.log(`Artist "${artist.name}" 已添加。`);
        return await newArtist.save()
        
    }catch(e){
        console.log(e);
        return
    }
}

const addTag = async (tag) => {
    try {
        const newTag = new Tag({
            name: tag.name,
            count: parseInt(tag.count)
        });
        const saveTag = await newTag.save();
        console.log(`标签 "${tag.name}" 已添加。`);
    } catch (error) {
        console.error('添加标签时出错：', error);
    }
};

const addTrack = async (track)=>{
    try{
        var tags = JSON.parse(track.tags)

        const newTrack = new Track({
            id_string: track.track_id,
            name: track.title,
            album: track.release,
            artist: null,
            year: track.year,
            ne_song_id: track.ne_song_id,
            cover: track.ne_song_cover,
            duration: track.ne_duration,
            lyric: track.ne_lyric,
            tags: [],
            summary: track.summary,
            published: track.published,
        });

        const artist = await Artist.findOne({ name: track.artist_name });
        if (artist) {
            newTrack.artist = artist._id;
        }

        if(tags != null){
            for (const tagInfo of tags) {
                const tag = await Tag.findOne({ name: tagInfo.name });
                if (tag) {
                    newTrack.tags.push({
                        tag: tag._id,
                        count: tagInfo.count
                    });
                }
            }
        }
        console.log(`Track "${track.title}" 已添加。`);
        return await newTrack.save()

    }catch(e){
        console.log(e);
    }
}

module.exports = {
    addPlayList,
    addPlayListTrack,
    deletePlayListTracks,
    getPlayListTracks,
    getPlayLists,
    getPlayList,
    getUser,
    getUsers,
    getUserByEmail,
    addUser,
    addArtist,
    addTrack,
    getTracksByArtist,
    addTag,
    getTracks,
    getRandomTracks,
    getRandomArtists,
    getArtist
}

