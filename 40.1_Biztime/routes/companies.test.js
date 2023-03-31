process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require("../app");
const db = require("../db");

let testCompany;

beforeEach(async function () {
	let result = await db.query(`
    INSERT INTO
      companies (code, name) 
      VALUES ('testcompany','TestCompany')
      RETURNING *`);
	testCompany = result.rows[0];

	let result2 = await db.query(`
    INSERT INTO
      invoices (comp_code, amt) 
      VALUES ('testcompany','300')
      RETURNING *`);
	testInvoices = result2.rows.map((inv) => inv.id);
});

afterEach(async function () {
	// delete any data created by test
	await db.query("DELETE FROM companies");
});

afterAll(async function () {
	// close db connection
	await db.end();
});

describe("GET /companies", function () {
	test("Gets a list of 1 company", async function () {
		const response = await request(app).get(`/companies`);
		expect(response.statusCode).toEqual(200);
		expect(response.body).toEqual({
			companies: [{ code: testCompany.code, name: testCompany.name }],
		});
	});
});

describe("GET /companies/:id", function () {
	test("Gets details of 1 comapny and it's 1 invoice", async function () {
		const response = await request(app).get(`/companies/${testCompany.code}`);
		expect(response.statusCode).toEqual(200);
		expect(response.body).toEqual({
			company: { ...testCompany, invoices: testInvoices },
		});
	});
});

describe("GET /companies/:id", function () {
	test("Gets details of 1 comapny and it's 1 invoice", async function () {
		const response = await request(app).get(`/companies/${testCompany.code}`);
		expect(response.statusCode).toEqual(200);
		expect(response.body).toEqual({
			company: { ...testCompany, invoices: testInvoices },
		});
	});
});

describe("POST /companies", function () {
	test("Creates a company", async function () {
		const adamComp = {
			code: `adamcomp`,
			name: `Adam Corp`,
			description: `Adam's company`,
		};
        const response = await request(app)
            .post(`/companies`)
            .send(adamComp);
		expect(response.statusCode).toEqual(201);

		const newComp = await db.query(
			`SELECT *
            FROM companies
            WHERE code = 'adamcomp'`
		);
		expect(newComp.rows[0]).toEqual(adamComp);
	});
});
