import { IRoomsServer } from '../proto';

export interface Client<T>{
    client: T;
}

export interface IServer extends IRoomsServer {
    [key: string]: any;
}