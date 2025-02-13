const mongoose = require('mongoose');
const MongoStore = require('connect-mongo')
require('dotenv').config()


/* Schemas */
const {Artist} = require("./schema/artist");
const {Tag} = require("./schema/tag");
const {Track} = require("./schema/track");
const {User} = require("./schema/user");
// const {PlayList} = require("./schema/playList");
// const {PlayListTrack} = require("./schema/playListTrack");
// const {History} = require("./schema/history");
const {Rating} = require("./schema/rating");
const {Topic} = require("./schema/topic");


/* Variables */
let connected = false;
mongoose.connect(process.env.MONGO_CONNECTION);

const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', async () => {
    console.log(`Connected to ${process.env.MONGO_CONNECTION}`);
    connected = true;
});


/* Topic Function */
async function getTopicByTopicId(topic_id) {
    try {
        return await Topic.findOne({topic_id: topic_id});
    } catch (error) {
        console.log(error);
    }

}

/* trackVec Function */
async function addTrackVec(trackId, vector) {
    try {
        if (!(vector instanceof Float32Array)) {
            return
        }

        const vectorArray = Array.from(vector);

        const result = await TrackVec.findOneAndUpdate(
            { track: trackId },  // 查找条件
            { $set: { vec: vectorArray } },  // 更新操作
            { 
                new: true,  // 返回更新后的文档
                upsert: true,  // 如果不存在则创建新文档
                runValidators: true  // 运行 schema 验证
            }
        );

        if (result) {
            console.log(`TrackVec updated successfully for trackId: ${trackId}`);
            return result;
        } else {
            throw new Error('Update operation did not return a result');
        }
    } catch (error) {
        console.error(`Error in addTrackVec for trackId ${trackId}:`, error);
        throw error;
    }
}

async function getTrackVecs() {
    try {
        return await TrackVec.find().populate("track");
    } catch (error) {
        console.log(error);
    }

}

const getLyricTopWords = async (track) => {
    try {
        return await TopWord.findOne({ track: track });
    } catch (error) {
        console.log(error);
    }
}


/* Search Function */
const search = async (keyword, type, limit) => {
    try {
        // 将关键词分割成单词
        const keywords = keyword.toLowerCase().split(/\s+/);
        
        // 创建一个匹配所有关键词的正则表达式 
        // (?=.*to)：该部分正则表达式的含义是匹配任意字符串中包含字符串"to"的部分
        const regex = new RegExp(keywords.map(k => `(?=.*${k})`).join(''), 'i');
        
        // 创建完全匹配的正则表达式
        const exactMatch = new RegExp(`^${keyword}$`, 'i');
        
        let result = {};
        
        const aggregatePipeline = [
            { $match: { name: regex } },
            { $addFields: {
                exactMatch: {
                    $cond: [
                        { $regexMatch: { input: "$name", regex: exactMatch } },
                        1,
                        0
                    ]
                },
                score: {
                    $cond: [
                        { $regexMatch: { input: "$name", regex: exactMatch } },
                        0,
                        {
                            $reduce: {
                                input: keywords,
                                initialValue: 0,
                                in: {
                                    $add: [
                                        "$$value",
                                        { $indexOfBytes: [ { $toLower: "$name" }, "$$this" ] }
                                    ]
                                }
                            }
                        }
                    ]
                }
            }},
            { $sort: { exactMatch: -1, score: 1 } },
            { $limit: parseInt(limit) }
        ];

        switch(type) {
            case 'tracks':
                result.tracks = await Track.aggregate([
                    ...aggregatePipeline,
                    { $lookup: {
                        from: 'artists',
                        localField: 'artist',
                        foreignField: '_id',
                        as: 'artist'
                    }},
                    { $unwind: '$artist' }
                ]);
                break;
            case 'artists':
                result.artists = await Artist.aggregate(aggregatePipeline);
                break;
            case 'lyrics':
                result.lyrics = await Track.aggregate([
                    { $match: { lyric: regex } },
                    { $addFields: {
                        exactMatch: {
                            $cond: [
                                { $regexMatch: { input: "$lyric", regex: exactMatch } },
                                1,
                                0
                            ]
                        },
                        score: {
                            $cond: [
                                { $regexMatch: { input: "$lyric", regex: exactMatch } },
                                0,
                                { $add: [
                                    1,
                                    { $indexOfBytes: [ { $toLower: "$lyric" }, keyword.toLowerCase() ] }
                                ]}
                            ]
                        }
                    }},
                    { $sort: { exactMatch: -1, score: 1 } },
                    { $limit: parseInt(limit) },
                    { $lookup: {
                        from: 'artists',
                        localField: 'artist',
                        foreignField: '_id',
                        as: 'artist'
                    }},
                    { $unwind: '$artist' }
                ]);
                break;
            default:
                throw new Error('Invalid search type');
        }

        return result;
    } catch (error) {
        console.error('Search error:', error);
        throw error;
    }
};

/* History Function */
const getHistories = async (user,startDate,endDate) => {
    if (startDate === undefined || endDate === undefined) {
        startDate = new Date('1971-01-01').toISOString();
        endDate = new Date().toISOString();
    } else {
        startDate = new Date(startDate).toISOString();
        endDate = new Date(endDate + "T23:59:59Z").toISOString();
    }
 
    try {
        const history = await History.find({
            user: user,
            createdAt: { $gte: startDate, $lte: endDate }
        })
        .populate({
            path: 'track',
            populate: {
                path: 'tags.tag',
                model: 'Tag'
            },
            populate: {
                path: 'artist',
                model: 'Artist'
            }
        })
        .populate({
            path: 'artist',
            populate: {
                path: 'tags.tag',
                model: 'Tag'
            }
        });
        return history;
    } catch (error) {
        console.log(error);
    }
}

const addHistory = async (newHistory) => {
    try {
        const history = History(
            {
                track: newHistory.track,
                artist: newHistory.artist,
                user: newHistory.user,
                duration: parseInt(newHistory.duration) || 0
            }
        )
        const savedHistory = await history.save()
        return savedHistory;
    } catch (error) {
        console.log(error);
    }
}

/* Tag Function */
const getAllTags = async (limit) => {
    try {
        // 聚合管道数组
        const pipeline = [
            {
                $sort: { count: -1, name: 1 } // 先按 count 字段降序，再按 name 字段升序排序
            }
        ];

        // 如果提供了 limit 参数，则添加 $limit 阶段
        if (limit) {
            pipeline.push({
                $limit: parseInt(limit)
            });
        }

        // 使用聚合框架执行聚合管道
        const tags = await Tag.aggregate(pipeline);

        return tags;
    } catch (error) {
        console.log(error);
    }
}

const getAllYears = async (limit) => {
    try {
        // 使用 MongoDB 的聚合框架进行操作
        const years = await Track.aggregate([
            {
                $group: {
                    _id: "$year",
                    year: { $first: "$year" } // 添加返回的年份字段
                }
            },
            {
                $project: {
                    _id: 0, // 不返回默认的 _id 字段
                    year: 1 // 返回年份字段
                }
            },
            {
                $sort: { year: 1 } // 对年份进行升序排序
            },
            {
                $limit: parseInt(limit) // 添加限制
            }
        ]);

        return years;
    } catch (error) {
        console.log(error);
    }
}

const getTagById = async (tag) => {
    try {
        return await Tag.findById(tag)
    } catch (error) {
        console.log(error);
    }
};

const updateTrackTags = async (track, tags) => {
    try {
        return await Track.findByIdAndUpdate(
            track,
            { $set: { tags: tags } },
            { new: true, runValidators: true }
        );
    } catch (error) {
        console.log(error);
    }
};

const searchTagByName = async (keyword) => {
    try {
        const tag = await Tag.findOne({ name: { $regex: keyword, $options: 'i' } }, '_id name count');
        return tag ? { _id: tag._id, name: tag.name, count: tag.count } : null;
    } catch (error) {
        console.log(error);
        throw error;
    }
};



const getTagsByKeyword = async (keyword) => {
    try {
        // 将关键词转换为小写
        const lowercaseKeyword = keyword.toLowerCase();

        // 创建部分匹配的正则表达式
        const partialMatchRegex = new RegExp(lowercaseKeyword, 'i');
        
        // 创建完全匹配的正则表达式
        const exactMatchRegex = new RegExp(`^${lowercaseKeyword}$`, 'i');

        // MongoDB 聚合管道
        const tags = await Tag.aggregate([
            // 1. 匹配包含关键词的文档
            { $match: { name: { $regex: partialMatchRegex } } },
            
            // 2. 添加 exactMatch 和 score 字段
            { $addFields: {
                exactMatch: {
                    $cond: [
                        { $regexMatch: { input: "$name", regex: exactMatchRegex } },
                        1,
                        0
                    ]
                },
                score: {
                    $cond: [
                        { $regexMatch: { input: "$name", regex: exactMatchRegex } },
                        0,
                        {
                            $indexOfBytes: [{ $toLower: "$name" }, lowercaseKeyword]  // 计算部分匹配的位置
                        }
                    ]
                }
            }},

            // 3. 排序：首先按 exactMatch 降序，然后按 score 升序
            { $sort: { exactMatch: -1, score: 1, count: -1 } },
            
            // 4. 限制返回结果的数量
            { $limit: 100 },

            // 5. 仅返回需要的字段
            { $project: { _id: 1, name: 1 } }
        ]);

        return tags;
    } catch (error) {
        console.log(error);
        throw error;  // 处理错误
    }
};

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
        const user = await User.findOne({_id: id}).populate("tags.tag");
        const { password, ...userWithoutPassword } = user.toObject();

        return userWithoutPassword;
    } catch (error) {
        console.log(error);
    }
};

const getUsers = async () => {
    try {
        return await User.find().populate("tags.tag");
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

const updateSpotifyRefreshToken = async (id, token) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { spotify_refresh_token: token },
            { new: true } // 返回更新后的文档
          );
      
          if (!updatedUser) {
            throw new Error('User not found');
          }
          return updatedUser;
    } catch (error) {
        console.log(error);
    }
};

const updateUserTags = async (id, tags) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { tags: tags },
            { new: true } // 返回更新后的文档
          );
      
          if (!updatedUser) {
            throw new Error('User not found');
          }
          return updatedUser.populate("tags.tag");
    } catch (error) {
        console.log(error);
    }
};

/* Track Function */
const getAllTracks = async () => {
    try {
        return await Track.find().populate("artist");
    } catch (error) {
        console.log(error);
    }
};
const updateTrackCoverAndPublished = async (trackId, newCover, newPublished) => {
    try {
        // 构建更新对象
        const updateData = {};
        if (newCover !== undefined) {
            updateData.cover = newCover;
        }
        if (newPublished !== undefined) {
            updateData.published = newPublished;
        }

        // 仅在有更新数据时进行更新操作
        if (Object.keys(updateData).length > 0) {
            const updatedTrack = await Track.findByIdAndUpdate(
                trackId,
                { $set: updateData },
                { new: true, useFindAndModify: false }
            );
            return updatedTrack;
        } else {
            // 如果没有要更新的数据，返回 null 或其他适当的响应
            return null;
        }
    } catch (error) {
        console.error('Error updating track:', error);
        throw error;
    }
};

const updateLyric = async (trackId, newLyric) => {
    try {
        const updatedTrack = await Track.findByIdAndUpdate(
            trackId, 
            { $set: { lyric: newLyric } }, 
            { new: true, useFindAndModify: false }
        );
        return updatedTrack;
    } catch (error) {
        console.error('Error updating track:', error);
        throw error;
    }
};

const getTracks = async () => {
    try {
        return await Track.find().populate("artist").populate("tags").populate("tags.tag").limit(50);
    } catch (error) {
        console.log(error);
    }
};

const getTfidfSimilarity = async (track) => {
    try {
        return await TfidfSimilarity.findOne({track: track})
        .populate({
            path: 'topsimilar',
            populate: {
                path: 'track',
                populate: {
                    path: 'artist'
                }
            }
        });
    } catch (error) {
        console.log(error);
    }
};

const getW2VSimilarity = async (track) => {
    try {
        return await W2vSimilarity.findOne({track: track})
        .populate({
            path: 'topsimilar',
            populate: {
                path: 'track',
                populate: {
                    path: 'artist'
                }
            }
        });
    } catch (error) {
        console.log(error);
    }
};

const getLdaSimilarity = async (track) => {
    try {
        return await LdaSimilarity.findOne({track: track})
        .populate({
            path: 'topsimilar',
            populate: {
                path: 'track',
                populate: {
                    path: 'artist'
                }
            }
        });
    } catch (error) {
        console.log(error);
    }
};

const getWeightedSimilarity = async (track) => {
    try {
        return await WeightedSimilarity.findOne({track: track})
        .populate({
            path: 'topsimilar',
            populate: {
                path: 'track',
                populate: {
                    path: 'artist'
                }
            }
        });
    } catch (error) {
        console.log(error);
    }
};

const getTracksByArtist = async (artist) => {
    try {
        // 检查传入的 artist 是否为有效的 ObjectId
        if (!mongoose.Types.ObjectId.isValid(artist)) {
            throw new Error('Invalid ObjectId');
        }

        // 查询数据库
        return await Track.find({ artist: artist })
            .populate('artist')
            .populate('tags')
            .populate('tags.tag')
            .limit(50);
    } catch (error) {
        console.log(error);
        return null; // 根据需求处理错误
    }
};

const getTracksByTag = async (tag) => {
    try {
        return await Track.find({ 'tags.tag': tag })
            .populate('artist')
            .populate('tags.tag')
            .limit(50);
    } catch (error) {
        console.log(error);
    }
};

const getTracksByTags = async (tags) => {
    // const tags = [
    //     mongoose.Types.ObjectId('60d5f9f9fc13ae1d3c000001'),
    //     mongoose.Types.ObjectId('60d5f9f9fc13ae1d3c000002')
    //   ];
    try {
        return await Track.find({ 'tags.tag': { $all: tags } })
            .populate('artist')
            .populate('tags.tag')
            .limit(50);
    } catch (error) {
        console.log(error);
        throw error; // Optionally rethrow the error to handle it further up the call stack
    }
};


const getTrackById = async (track) => {
    try {
        return await Track.findById(track)
            .populate({
                path: 'artist',
                populate: {
                    path: 'tags.tag'
                }
            })
            .populate('tags.tag');
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
// const addArtist = async (artist) => {
//     // Update Algorithm
//     try {
//         return await Artist.findOne({_id:id}).populate("tags").populate("tags.tag");
//     } catch (error) {
//         console.log(error);
//     }
// };


const getAllArtists = async () => {
    try {
        return await Artist.find();
    } catch (error) {
        console.log(error);
    }
};

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

const getArtistsByTags = async (tags) => {
    // const tags = [
    //     mongoose.Types.ObjectId('60d5f9f9fc13ae1d3c000001'),
    //     mongoose.Types.ObjectId('60d5f9f9fc13ae1d3c000002')
    //   ];
    try {
        return await Artist.find({ 'tags.tag': { $all: tags } })
            .populate('tags')
            .populate('tags.tag')
            .limit(50);
    } catch (error) {
        console.log(error);
        throw error; // Optionally rethrow the error to handle it further up the call stack
    }
};

const updateArtistAvatar = async (artistId, newAvatar) => {
    try {
        const updatedArtist = await Artist.findByIdAndUpdate(
            artistId, 
            { $set: { 
                avatar: newAvatar
             } 
            }, 
            { new: true, useFindAndModify: false }
        );
        return updatedArtist;
    } catch (error) {
        console.error('Error updating track:', error);
        throw error;
    }
};

/* Rating Function */
const getRating = async (user,item,itemType) => {
    try {
        // 构建查询条件
        let query = {
            user: user,
            item: item,
            itemType: itemType
        };
        // 执行查询
        const rating = await Rating.findOne(query).populate('item')
        // Check if item exists and if it has an artist field
        if (rating.item && rating.item.artist) {
            // Populate the artist field within the item
            await rating.populate('item.artist');
        }
        

        return rating;
    } catch (error) {
        console.error('Error in getRating:', error);
        throw error;
    }
}

const getRatings = async (user) => {
    try {
        // Find ratings for the specified user and populate the 'item' field
        const ratings = await Rating.find({ user }).populate('item');

        // Iterate over each rating
        for (let i = 0; i < ratings.length; i++) {
            const rating = ratings[i];
            // Check if item exists and if it has an artist field
            if (rating.item && rating.item.artist) {
                // Populate the artist field within the item
                await rating.populate('item.artist');
            }
        }

        return ratings; // Return the entire ratings array
    } catch (error) {
        console.error('Error in getRatings:', error);
        throw error;
    }
}

const addRating = async (item) => {
    try {
        const filter = {
            user: item.user,
            item: item.item,
            itemType: item.itemType
        };

        const update = {
            $set: {
                rate: item.rate
            }
        };

        const options = {
            new: true,  // 返回更新后的文档
            upsert: true,  // 如果不存在则创建新文档
            runValidators: true,  // 确保更新操作也会运行验证器
            setDefaultsOnInsert: true  // 如果是新文档，设置默认值
        };

        const savedRating = await Rating.findOneAndUpdate(filter, update, options);
        return savedRating;
    } catch (error) {
        console.error('Error in addRating:', error);
        throw error;  // 将错误抛出，而不是直接返回
    }
};

const deleteRating = async (user, item, itemType) => {
    try {
        // 执行查询并删除
        const rating = await Rating.findOneAndDelete({ user: user, item: item, itemType: itemType });
        return rating;
    } catch (error) {
        console.error('Error in deleteRating:', error);
        throw error;
    }
}


/* Data Prepare Function */
const addArtist = async (artist) => {
    try {
        // Check if the artist already exists in the database
        let existingArtist = await Artist.findOne({ name: artist.name });
        if (existingArtist) {
            console.log(`Artist "${artist.name}" already exists in the database.`);
            return existingArtist._id; // Return existing artist's ID
        }

        var tags = JSON.parse(artist.tags);

        const newArtist = new Artist({
            name: artist.name,
            tags: [],
            familiarity: artist.familiarity,
            hotness: artist.hotness,
            avatar: artist.avatar,
            summary: artist.summary,
            published: artist.published
        });

        if (tags != null) {
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

        await newArtist.save();
        console.log(`Artist "${artist.name}" has been added to the database.`);
        return newArtist._id; // Return newly created artist's ID

    } catch (e) {
        console.error('Error adding artist:', e);
        return null; // Return null or handle error as appropriate
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
        return saveTag
        
    } catch (error) {
        console.error('添加标签时出错：', error);
    }
};

const addTrack = async (track)=>{
    try{
        // Check if the artist already exists in the database
        let existingTrack = await Track.findOne({ name: track.name });
        if (existingTrack) {
            console.log(`Track "${track.name}" already exists in the database.`);
            return existingTrack._id; // Return existing artist's ID
        }

        var tags = JSON.parse(track.tags)

        const newTrack = new Track({
            name: track.name,
            album: track.album? track.album : "",
            artist: null,
            year: track.year,
            cover: track.cover,
            duration: track.duration,
            lyric: track.lyric,
            tags: [],
            summary: track.summary,
            published: track.published,
        });

        const artist = await Artist.findOne({ name: track.artist });
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
        console.log(`Track "${track.name}" 已添加。`);
        return await newTrack.save()

    }catch(e){
        console.log(e);
    }
}

module.exports = {
    getTopicByTopicId,
    getLyricTopWords,
    addTrackVec,
    getTrackVecs,
    updateTrackTags,
    search,
    getHistories,
    addHistory,
    getAllTags,
    getAllYears,
    getTagById,
    getTagsByKeyword,
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
    updateSpotifyRefreshToken,
    updateUserTags,
    getAllArtists,
    updateArtistAvatar,
    addArtist,
    updateLyric,
    getAllTracks,
    getTfidfSimilarity,
    getW2VSimilarity,
    getLdaSimilarity,
    getWeightedSimilarity,
    addTrack,
    getTracksByArtist,
    getTrackById,
    getTracksByTag,
    getTracksByTags,
    searchTagByName,
    addTag,
    updateTrackCoverAndPublished,
    getTracks,
    getRandomTracks,
    getRandomArtists,
    getArtistsByTags,
    getArtist,
    addRating,
    getRating,
    getRatings,
    deleteRating
}

