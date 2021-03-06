/* EdgeVPNio
* Copyright 2020, University of Florida
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
* THE SOFTWARE.
*/

const mongoose = require('mongoose')
const Model = require('./Model')
const {DataBaseInterface} = require('./DatabaseInterface');
const mongo = require('mongodb');
const {overlayModel, topologyModel} = require('./Model');
const {DataTransformer} = require('../controllers/DataTransformer')

class MongoDBImpl extends DataBaseInterface {
    // Stores the url and dbname and is available for every instance
    constructor(url, dbname) {
        super(url);
        // Once an instance is created the db connection is kept until the instance is alive.
        this.connection = mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true})
        this.dbname = dbname;
        this.db = mongoose.connection.client;
    }

    getDb() {
        return this.db;
    }

    /**
     * Function to insert the PUT data sent by the EVIO nodes into 
     * collections: 1) Overlays
     *              2) Topology
     * 
     * @param {Json} data Aggregated data Object
     * @param {Number} timestamp End timestamp at which object was taken.
     */
    async insertInto(data, timestamp) {
        var dataTrasformer = new DataTransformer();
        // The data is transformed to the required form and returned as an array of arrays.
        var transformedData = dataTrasformer.transformData(data);
        var overlaySaveData = new overlayModel({
            _id:timestamp,
            Overlays:transformedData[0] // Overlays array
        });
        // Overlay data is put into the db with the below call.
        overlaySaveData.save(function (err) {
            if (err) { console.log(err.stack); }
            //console.log("Saved Overlay data for timestamp: " + timestamp);
        });
        var topologySaveData = new topologyModel({
            _id:timestamp,
            Topology: transformedData[1] // Topology Array
        })
        // Topology data is put into the db with the below call.
        topologySaveData.save(function (err) {
            if (err) { console.log(err.stack); }
            //console.log("Saved Topology data for timestamp:" + timestamp);
        });
    }

    /**
     * Database call to get the intervals stored.
     * 
     * @param {String} tableName Model Name to use to find the intervals.
     */
    async getIntervals(tableName) {
        return tableName.find({},{"Overlays":0});
    }

    /**
     * Database call to get the high level Overlay information.
     * 
     * @param {String} tableName Model to use to get the overlay.
     * @param {String} intervalId Interval identifier to query.
     */
    async getOverlays(tableName, intervalId) {
        if(intervalId) {
            return tableName.find({ "_id": { $gt: intervalId } }).sort({'_id':1}).limit(1);
        }
        return tableName.find().sort({'_id':-1}).limit(1);
    }

    /**
     * Database call to get the detailed topology information.
     * 
     * @param {String} tableName 
     * @param {String} intervalId 
     * @param {String} overlayId 
     */
    async getTopology(tableName, intervalId, overlayId) {
        return tableName.find({"Topology.OverlayId":overlayId,"_id":intervalId});
    }
}

module.exports = { MongoDBImpl }