import type { Encounter, Patient, UserAccount } from '../../types';
export function initializeDatabase(training:any,references:any[]):Promise<void>;
export function importSyntheticPack(pack:any,user:UserAccount):Promise<string>;
export function listPacks():Promise<any[]>;
export function getRun(id:string):Promise<any>;
export function listRuns(encounterId:string):Promise<any[]>;
export function createRun(e:Encounter,p:Patient,u:UserAccount,key:string):Promise<any>;
export function reviewClassification(id:string,e:Encounter,p:Patient,u:UserAccount,command:any,revision:number):Promise<any>;
export function confirmClassificationSet(id:string,e:Encounter,p:Patient,u:UserAccount,revision:number):Promise<any>;
export function getManagement(id:string,e:Encounter,p:Patient,u:UserAccount):Promise<any>;
export function authorizeSigning(id:string,e:Encounter,p:Patient,u:UserAccount):Promise<any>;
export function exportReviewDatabase():Promise<any>;

export function getCurrentRun(encounterId:string):Promise<any>;
