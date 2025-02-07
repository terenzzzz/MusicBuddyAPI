const db = require('../db/index')
const logger = require('../utils/logger');
const axios = require('axios');
const mongodb = require("../model/mongodb");
require('dotenv').config()
const recommend_api_url = process.env.MODEL_API 

exports.getTrackTopic = async (req, res) => {
  try {
      // Extract the track parameter from the request
      const { track } = req.query;

      // Send GET request to the target server
      const response = await axios.get(`${recommend_api_url}/getTrackTopic`, {
          params: { track: track }
      });

      // Send the relevant part of the response back to the client
      return res.send({ status: 200, message: 'Success', data: response.data });

  } catch (e) {
      return res.send({ status: 1, message: e.message });
  }
};

exports.getTrackTopicByLyric = async (req, res) => {
  try {
      const { lyric } = req.body; // 从请求体中获取数组

      // Send POST request to the target server
      const { data } = await axios.post(`${recommend_api_url}/getTrackTopicByLyric`, {
        lyric: lyric 
      });

      // 遍历response并获取代表词
      const enrichedData = await Promise.all(
        data.map(async (topic) => {
          const { topic_id } = topic;
          
          // 查询数据库获取代表词
          const topicDetail = await mongodb.getTopicByTopicId(topic_id);
          
          // 返回包含原始数据和代表词的新对象
          return {
            ...topic,
            name: topicDetail.name // 假设代表词字段是'represent_word'
          };
        })
      );

      // Send the relevant part of the response back to the client
      return res.send({ status: 200, message: 'Success', data: enrichedData });

  } catch (e) {
      return res.send({ status: 1, message: e.message });
  }
};


exports.getLyricTopWords = async (req, res) => {
  try{
    const topwords = await mongodb.getLyricTopWords(req.query.track)
    return res.send({ status: 200, message: 'Success', data: topwords})
  }catch(e){
    return res.send({ status: 1, message: e.message })
  }
};

exports.getLyricTopWordsByLyric = async (req, res) => {
  try {
      const { lyric } = req.body; // 从请求体中获取数组

      // Send POST request to the target server
      const response = await axios.post(`${recommend_api_url}/getLyricTopWordsByLyric`, {
        lyric: lyric 
      });

      // Send the relevant part of the response back to the client
      return res.send({ status: 200, message: 'Success', data: response.data });

  } catch (e) {
      return res.send({ status: 1, message: e.message });
  }
};

exports.getRandomTracks = async (req, res) => {
  try{
    const tracks = await mongodb.getRandomTracks()
    return res.send({ status: 200, message: 'Success', data: tracks})
  }catch(e){
    return res.send({ status: 1, message: e.message })
  }
}

exports.getTracks = async (req, res) => {
  try{
    const tracks = await mongodb.getTracks()
    return res.send({ status: 200, message: 'Success', data: tracks})
  }catch(e){
    return res.send({ status: 1, message: e.message })
  }
};

exports.getTracksByArtist = async (req, res) => {
  try{
    const tracks = await mongodb.getTracksByArtist(req.query.artist)
    return res.send({ status: 200, message: 'Success', data: tracks})
  }catch(e){
    return res.send({ status: 1, message: e.message })
  }
};

exports.getTrackById = async (req, res) => {
  try{
    const track = await mongodb.getTrackById(req.query.track)
    return res.send({ status: 200, message: 'Success', data: track})
  }catch(e){
    return res.send({ status: 1, message: e.message })
  }
};

exports.getTracksByTag = async (req, res) => {
  try{
    const track = await mongodb.getTracksByTag(req.query.tag)
    return res.send({ status: 200, message: 'Success', data: track})
  }catch(e){
    return res.send({ status: 1, message: e.message })
  }
};

exports.getTracksByTags = async (req, res) => {
  try{
    // [ '65ff68821fb3dffa69e8b523' ]
    const tags = req.query.tags.split(',');
    const tracks = await mongodb.getTracksByTags(tags);
    return res.send({ status: 200, message: 'Success', data: tracks})
  }catch(e){
    return res.send({ status: 1, message: e.message })
  }
};

exports.getDailyRecomm = async (req, res) => {
  // TODO: Update Recomm Algorithm
  try{
    const tracks = await mongodb.getRandomTracks()
    return res.send({ status: 200, message: 'Success', data: tracks})
  }catch(e){
    return res.send({ status: 1, message: e.message })
  }
}

exports.getResonanace = async (req, res) => {
  // TODO: Update Algorithm
  try{
    const tracks = await mongodb.getRandomTracks()
    return res.send({ status: 200, message: 'Success', data: tracks})
  }catch(e){
    return res.send({ status: 1, message: e.message })
  }
}

exports.getMoodVibe = async (req, res) => {
  // TODO: Update Algorithm
  try{
    const tracks = await mongodb.getRandomTracks()
    return res.send({ status: 200, message: 'Success', data: tracks})
  }catch(e){
    return res.send({ status: 1, message: err.message })
  }
}

exports.getSceneRhythm = async (req, res) => {
  // TODO: Update Algorithm
  try{
    const tracks = await mongodb.getRandomTracks()
    return res.send({ status: 200, message: 'Success', data: tracks})
  }catch(e){
    return res.send({ status: 1, message: e.message })
  }
}

exports.getRecentlyPlayed = async (req, res) => {
  try{
    const histories = await mongodb.getHistories(req.user._id);
    const reversedHistories = histories.reverse(); // 将历史记录数组顺序颠倒
    
    const tracks = reversedHistories.map(history => history.track);
    return res.send({ status: 200, message: 'Success', data: tracks})
  }catch(e){
    return res.send({ status: 1, message: e.message })
  }
}

