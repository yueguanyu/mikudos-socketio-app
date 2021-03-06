import { HandlerBase } from '../handler-base';
import { Application } from '../../app';
import { mikudos } from '../../namespace';
import Debug from 'debug';
const debug = Debug('mikudos:json-rpc');

const JsonRpcError = require('json-rpc-error');

export class JSON_RPC_HANDLER extends HandlerBase {
    namespaces: any = {};
    public authenticated: boolean;
    constructor(
        public app: Application,
        namespaces: object,
        { eventPath = 'rpc-call', authenticated = true } = {}
    ) {
        super(eventPath);
        this.authenticated = authenticated;
        this.namespaces = namespaces;
    }

    register(socket: mikudos.Socket) {
        debug(
            `register json-rpc service ${
                this.authenticated ? 'with auth' : 'without auth'
            }`
        );
        socket.on(this.eventPath, async (request: any, callback: Function) => {
            if (!this.app.io) return;
            request.socket = socket;
            const [namespace, method] = String(request.method).split('.');
            let response: any = await this.handle(namespace, method, request);
            response.method = `${namespace}.${method}`;
            callback(response);
            this.app.publishFilter && this.app.publishEvent(response);
        });
    }

    async handle(namespace: string, method: string, request: any) {
        let result: any = {};
        try {
            result = await this.namespaces[namespace].handle(method, request);
        } catch (error) {
            result.error = this.parseError(error);
        }
        return result;
    }

    parseError(error: Error) {
        if (error instanceof JsonRpcError) return error;
        else if (error instanceof Error)
            return new JsonRpcError(error.message, -32000, {});
        else return new JsonRpcError('internal Error', -32000, {});
    }
}
