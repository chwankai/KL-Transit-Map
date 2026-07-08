import protobuf from "protobufjs";

const gtfsRtProtoJson = {
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

const root = protobuf.Root.fromJSON(gtfsRtProtoJson);
const FeedMessage = root.lookupType("transit_realtime.FeedMessage");

export interface DecodedVehicle {
  vehicleId: string;
  routeId: string;
  licensePlate: string;
  lat: number;
  lng: number;
  speed: string;
  timestamp: number;
}

export function decodeVehiclePositions(buffer: Uint8Array): DecodedVehicle[] {
  const message = FeedMessage.decode(buffer) as any;
  const list: DecodedVehicle[] = [];

  if (message.entity && message.entity.length > 0) {
    message.entity.forEach((ent: any) => {
      if (ent.vehicle && ent.vehicle.position && ent.vehicle.trip) {
        const routeId = ent.vehicle.trip.route_id || "Unknown";
        const vehicleId = ent.vehicle.vehicle
          ? ent.vehicle.vehicle.id || ent.vehicle.vehicle.license_plate
          : ent.id;
        const licensePlate = ent.vehicle.vehicle ? ent.vehicle.vehicle.license_plate : "N/A";
        const lat = ent.vehicle.position.latitude;
        const lng = ent.vehicle.position.longitude;
        const speed = ent.vehicle.position.speed
          ? (ent.vehicle.position.speed * 3.6).toFixed(1)
          : "0.0";
        const timestamp = ent.vehicle.timestamp
          ? Number(ent.vehicle.timestamp) * 1000
          : Date.now();

        list.push({
          vehicleId,
          routeId,
          licensePlate,
          lat,
          lng,
          speed,
          timestamp,
        });
      }
    });
  }

  return list;
}
