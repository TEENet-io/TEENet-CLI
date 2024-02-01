import {EventEmitter} from 'events';

export class Logger extends EventEmitter {
	public log(msg: string) {
		this.emit('log', msg);
	}
}

let logger: Logger;
export class LoggerFactory {
	public static getInstance(): Logger {
		if(!logger) {
			logger = new Logger();
		}
		return logger;
	}
}
