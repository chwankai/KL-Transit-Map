const http = require('https');
const protobuf = require('protobufjs');

// Minimal GTFS-RT JSON schema for vehicle positions
const schema = {
  nested: {
    transit_realtime: {
      nested: {
        FeedMessage: {
          fields: {
            header: { rule: "required", type: "FeedHeader", id: 1 },
            entity: { rule: "repeated", type: "FeedEntity", id: 2 }
          }
        },
        FeedHeader: {
          fields: {
            gtfs_realtime_version: { rule: "required", type: "string", id: 1 },
            incrementality: { type: "int32", id: 2 },
            timestamp: { type: "uint64", id: 3 }
          }
        },
        FeedEntity: {
          fields: {
            id: { rule: "required", type: "string", id: 1 },
            is_deleted: { type: "bool", id: 2 },
            trip_update: { type: "TripUpdate", id: 3 },
            vehicle: { type: "VehiclePosition", id: 4 },
            alert: { type: "Alert", id: 5 }
          }
        },
        TripUpdate: {
          fields: {
            trip: { rule: "required", type: "TripDescriptor", id: 1 }
          }
        },
        VehiclePosition: {
          fields: {
            trip: { type: "TripDescriptor", id: 1 },
            position: { type: "Position", id: 2 },
            current_stop_sequence: { type: "uint32", id: 3 },
            current_status: { type: "int32", id: 4 },
            timestamp: { type: "uint64", id: 5 },
            congestion_level: { type: "int32", id: 6 },
            stop_id: { type: "string", id: 7 },
            vehicle: { type: "VehicleDescriptor", id: 8 }
          }
        },
        Alert: {
          fields: {
            active_period: { rule: "repeated", type: "TimeRange", id: 1 }
          }
        },
        TimeRange: {
          fields: {
            start: { type: "uint64", id: 1 },
            end: { type: "uint64", id: 2 }
          }
        },
        TripDescriptor: {
          fields: {
            trip_id: { type: "string", id: 1 },
            route_id: { type: "string", id: 5 },
            direction_id: { type: "uint32", id: 6 }
          }
        },
        Position: {
          fields: {
            latitude: { rule: "required", type: "float", id: 1 },
            longitude: { rule: "required", type: "float", id: 2 },
            bearing: { type: "float", id: 3 },
            odometer: { type: "double", id: 4 },
            speed: { type: "float", id: 5 }
          }
        },
        VehicleDescriptor: {
          fields: {
            id: { type: "string", id: 1 },
            label: { type: "string", id: 2 },
            license_plate: { type: "string", id: 3 }
          }
        }
      }
    }
  }
};

const root = protobuf.Root.fromJSON(schema);
const FeedMessage = root.lookupType("transit_realtime.FeedMessage");

const url = "https://api.data.gov.my/gtfs-realtime/vehicle-position/mybas-johor/";

console.log("Fetching: " + url);
http.get(url, (res) => {
  if (res.statusCode !== 200) {
    console.error("Failed to load: status code " + res.statusCode);
    return;
  }

  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    console.log("Response length: " + buffer.length + " bytes");
    try {
      const message = FeedMessage.decode(new Uint8Array(buffer));
      console.log("Decoded successfully!");
      console.log(JSON.stringify(message, null, 2));
    } catch (e) {
      console.error("Error decoding:", e);
    }
  });
}).on('error', (err) => {
  console.error("Network error:", err);
});
