const { Pool } = require("pg");
const Cursor = require("pg-cursor");

const config = {
    user: "postgres",
    host: "localhost",
    database: "banco",
    password: "postgres",
    port: 5432,
};
const pool = new Pool(config);

const argumentos = process.argv.slice(2);
let funcion = argumentos[0];
/*let descripcion = argumentos[1];
let cuentaOrigen = argumentos[2];
let cuentaDestino = argumentos[3];
let monto = argumentos[4]; */

let hoy = new Date();
let fecha = hoy.getDate() + '-' + (hoy.getMonth() + 1) + '-' + hoy.getFullYear();
let hora = hoy.getHours() + ':' + hoy.getMinutes() + ':' + hoy.getSeconds();
fecha = fecha + ' ' + hora;

pool.connect(async(error_conexion, client, release) => {

    async function ingresarTransaccion(descripcion, cuentaOrigen, cuentaDestino, monto) {
        if (error_conexion) return console.error(error_conexion.code);

        const queryInsertTransaccionOrigen = {
            name: "insert-transaccion",
            text: "INSERT INTO transacciones(descripcion,fecha,monto,cuenta) values ($1,$2,$3,$4) RETURNING *;",
            values: [descripcion, fecha, monto, cuentaOrigen]
        };
        const queryInsertTransaccionDestino = {
            name: "insert-transaccion",
            text: "INSERT INTO transacciones(descripcion,fecha,monto,cuenta) values ($1,$2,$3,$4) RETURNING *;",
            values: [descripcion, fecha, monto, cuentaDestino]
        };
        const queryUpdateGiroCuenta = {
            name: "update-giro-cuenta",
            text: "UPDATE cuentas SET saldo = saldo - $2 WHERE id = $1 RETURNING *;",
            values: [cuentaOrigen, monto]
        };
        const queryUpdateAbonoCuenta = {
            name: "update-abono-cuenta",
            text: "UPDATE cuentas SET saldo = saldo + $2 WHERE id = $1 RETURNING *;",
            values: [cuentaDestino, monto]
        };
        const querySelectCuentaOrigen = {
            name: "select-cuenta-origen",
            text: "SELECT * FROM cuentas WHERE id = $1",
            values: [cuentaOrigen]
        };
        const querySelectCuentaDestino = {
            name: "select-cuenta-destino",
            text: "SELECT * FROM cuentas WHERE id = $1",
            values: [cuentaDestino]
        };

        let validarOrigen = true;
        try {
            let resOrigen = await client.query(querySelectCuentaOrigen);
            if ((resOrigen.rowCount) == 1) {
                validarOrigen = true;
            } else {
                validarOrigen = false;
                console.log(`Cuenta origen: ${cuentaOrigen} no existe en la Base de Datos.`);
            }
        } catch (e) {
            console.log('Clase de Error:', e.code);
        };

        let validarDestino = true;
        try {
            let resDestino = await client.query(querySelectCuentaDestino);
            if ((resDestino.rowCount) == 1) {
                validarDestino = true;
            } else {
                validarDestino = false;
                console.log(`Cuenta destino: ${cuentaDestino} no existe en la Base de Datos.`);
            }
        } catch (e) {
            console.log('Clase de Error:', e.code);
        };

        console.log(validarOrigen, ' ', validarDestino)
        try {

            if (validarOrigen && validarDestino) {
                await client.query("BEGIN");

                const giro = await client.query(queryUpdateGiroCuenta);
                const abono = await client.query(queryUpdateAbonoCuenta);

                let res1 = await client.query(queryInsertTransaccionOrigen);
                let res2 = await client.query(queryInsertTransaccionDestino);

                console.log("Giro realizado con éxito: ", giro.rows[0]);
                console.log("Abono realizado con éxito: ", abono.rows[0]);
                console.log("Registros afectados en Cuentas: ", giro.rowCount + abono.rowCount);
                console.log("Registros afectados en Transacciones: ", res1.rowCount + res2.rowCount);
                await client.query("COMMIT");
            } else {
                console.log('Favor crear cuenta que no existe.');
            }
        } catch (e) {
            await client.query("ROLLBACK");
            console.log('Clase de Error:', e.code);
            console.log("Detalle del error: " + e.detail);
            console.log("Tabla originaria del error: " + e.table);
            console.log("Restricción violada en el campo: " + e.constraint);
        } finally {
            release();
            pool.end();
        }
    };

    async function ingresarCuenta(cuenta, saldo) {

        if (error_conexion) return console.error(error_conexion.code);
        const querySelectCuenta = {
            name: "select-cuenta",
            text: "SELECT * FROM cuentas ORDER BY id",
        };
        const queryInsertCuenta = {
            name: "insert-cuenta",
            text: "INSERT INTO cuentas(id,saldo) values ($1,$2) RETURNING *;",
            values: [cuenta, saldo]
        };

        try {
            const res = await client.query(querySelectCuenta);
            console.log('Registros:', res.rows);
        } catch (e) {
            console.log('Clase de Error:', e.code);
        };

        try {
            const res = await client.query(queryInsertCuenta);
            console.log(res.rows[0]);
        } catch (e) {
            console.log('Clase de Error: ', e.code);
            console.log(`Cuenta: ${cuenta} ya se encuentra en la Base de Datos.`);
        } finally {
            release();
            pool.end();
        }
    };

    async function getTransacciones(cuenta) {

        if (error_conexion) return console.error(error_conexion.code);
        try {
            const consulta = new Cursor(`SELECT * FROM transacciones WHERE cuenta = ${cuenta}`);
            const cursor = client.query(consulta);
            cursor.read(10, (err, rows) => {
                console.log(rows);
                cursor.close();
                release();
                pool.end();
            })
        } catch (e) {
            console.log('Clase de Error: ', e.code);
        }
    };

    async function getSaldo(cuenta) {
        if (error_conexion) return console.error(error_conexion.code);
        try {
            const consulta = new Cursor(`SELECT * FROM cuentas WHERE id = ${cuenta}`);
            const cursor = client.query(consulta);
            cursor.read(1, (err, rows) => {
                console.log(rows);
                cursor.close();
                release();
                pool.end();
            })
        } catch (e) {
            console.log('Clase de Error: ', e.code);
        }
    }

    // Funciones
    if (funcion == "nuevo") {
        let descripcion = argumentos[1];
        let cuentaOrigen = argumentos[2];
        let cuentaDestino = argumentos[3];
        let monto = argumentos[4];
        console.log(descripcion, cuentaOrigen, cuentaDestino, monto);
        ingresarTransaccion(descripcion, cuentaOrigen, cuentaDestino, monto);
    };

    if (funcion == "cuenta") {
        let cuenta = argumentos[1];
        let saldo = argumentos[2];
        console.log(cuenta, saldo);
        ingresarCuenta(cuenta, saldo);
    };

    if (funcion == "consulta") {
        let cuenta = argumentos[1];
        getTransacciones(cuenta);
    };

    if (funcion == "saldo") {
        let cuenta = argumentos[1];
        getSaldo(cuenta);
    }
});