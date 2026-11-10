import type { Encounter, Patient, UserAccount } from '../../types';
export function snapshot(e:Encounter,p:Patient):string;
export function stable(value:unknown):string;
export function validatePack(pack:any):any;
export function compare(e:Encounter,p:Patient,u:UserAccount,pack:any,context:any):any;
export function assertFresh(run:any,e:Encounter,p:Patient,pack:any):void;
export function review(...args:any[]):any;
export function confirm(...args:any[]):any;
export function management(...args:any[]):any;
