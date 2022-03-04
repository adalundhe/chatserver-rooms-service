
import * as grpc from '@grpc/grpc-js';
import { Empty } from 'google-protobuf/google/protobuf/empty_pb';
import { RoomName, Room, RoomsList } from './proto';
import { IServer, Client } from './types/server';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';


export class RoomsServer implements IServer, Client<PrismaClient> {
    client: PrismaClient;

    constructor(){
        this.client = new PrismaClient();
    }

    async getRooms(_call: grpc.ServerUnaryCall<Empty, RoomsList>, callback: grpc.sendUnaryData<RoomsList>) {
        const rooms = await this.client.room.findMany();
        
        const roomsList = new RoomsList();
        roomsList.setRoomsList(rooms.map(room => {
            const foundRoom = new Room();
            foundRoom.setId(room.id);
            foundRoom.setName(room.name);
            foundRoom.setToken(room.token);

            return foundRoom;
        }));

        callback(null, roomsList);
    };

    async getRoom(call: grpc.ServerDuplexStream<RoomName, Room>): Promise<void> {
        call.on('data', async (roomName: RoomName) => {
            const request = await roomName.toObject();

            const foundRoom = await this.client.room.findFirst({
                where: {
                    AND: [
                        {
                            name: request.name
                        },
                        {
                            token: request.token
                        }
                    ]
                }
            });

            const room = new Room();
            await room.setId(foundRoom?.id as string);
            await room.setName(foundRoom?.name as string);
            await room.setToken(foundRoom?.token as string);

            call.write(room);
        });

        call.on('end', () => call.end());
    };

    async createOrUpdateRoom(call: grpc.ServerDuplexStream<Room, RoomName>): Promise<void> {
        call.on('data', async (room: Room) => {
            const request = await room.toObject();
            const createdRoom = await this.client.room.upsert({
                where: {
                    name: request.name
                },
                update: {
                    name: request.name,
                    token: request.token
                },
                create: {
                    id: uuidv4(),
                    name: request.name,
                    token: request.token as string
                }
            });

            const roomName = new RoomName();
            roomName.setName(createdRoom.name)

            call.write(roomName);
        });

        call.on('end', () => call.end());
    };

    async deleteRoom(call: grpc.ServerDuplexStream<RoomName, Empty>): Promise<void> {
        call.on('data', async (roomName: RoomName) => {
            const request = await roomName.toObject();
            await this.client.room.delete({
                where: {
                    name: request.name
                }
            });

            const empty = new Empty();
            call.write(empty);
        });

        call.on('end', () => call.end());
    };
}