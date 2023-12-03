declare module "alasql" {
  export interface Database {
    databaseid: string;
    dbversion: number;
    tables: { [key: string]: any };
    views: { [key: string]: any };
    triggers: { [key: string]: any };
    indices: { [key: string]: any };
    objects: { [key: string]: any };
    counter: number;
    sqlCache: { [key: string]: any };
    sqlCacheSize: number;
    astCache: { [key: string]: any };
    resetSqlCache: () => void;
    exec: (sql: string, params?: object, cb?: Function) => any;
    autoval: (tablename: string, colname: string, getNext: boolean) => any;
  }

  namespace alasql {
    export var Database: {
      new (databaseid?: string): Database;
    };
    export interface FnContainer {
      [key: string]: (...args: any[]) => any;
      listTables?: () => any;
      pathValue?: (path: string) => any;
      mapIdsToQuery?: (ids: number[], sqlQuery: string) => any[];
    }

    export var fn: FnContainer;
  }

  function alasql(sql: string, params?: any[]): any; // Adjust the signature as needed

  export default alasql;
}
