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

	test("Throws error that comapny is not found", async function () {
		const response = await request(app).get(`/companies/0`);
		expect(response.statusCode).toEqual(404);
		expect(response.body.error).toEqual(`Company code '0' not found.`);
	});
});

describe("POST /companies", function () {
	test("Creates a company", async function () {
		const adamComp = {
			name: `Adam Corp`,
			description: `Adam's company`,
		};
		const response = await request(app).post(`/companies`).send(adamComp);
		expect(response.statusCode).toEqual(201);
		expect(response.body).toEqual({ company: { ...adamComp, code: "adam-corp" } });

		const newComp = await db.query(
			`SELECT *
            FROM companies
            WHERE code = 'adam-corp'`
		);
		expect(newComp.rows[0]).toEqual({ ...adamComp, code: "adam-corp" });
	});
	test("Throws an error with invalid info", async function () {
		const badData = {
			what: `badData`,
			name: `Adam Corp`,
			baddescription: `Adam's company`,
		};
		const response = await request(app)
			.post(`/companies`)
			.send(badData)
			.expect(400);

		expect(response.body.error).toEqual("Must submit name and description");
	});
});

describe("PUT /companies", function () {
	test("Updates a company", async function () {
		const update = { name: "New Name", description: "new description!" };
		const response = await request(app)
			.put(`/companies/testcompany`)
			.send(update);

		expect(response.statusCode).toEqual(200);

		const expectedCompany = { ...update, code: testCompany.code };
		expect(response.body).toEqual({ company: expectedCompany });

		const updatedCompany = await db.query(
			`SELECT name, description, code
            FROM companies
            WHERE code = 'testcompany'`
		);

		expect(updatedCompany.rows[0]).toEqual(expectedCompany);
	});

	test("Throws an error when company not found", async function () {
		const update = { name: "New Name", description: "new description!" };
		const response = await request(app).put(`/companies/0`).send(update);

		expect(response.statusCode).toEqual(404);
		expect(response.body.error).toEqual(`Company code '0' not found.`);
	});
});

describe("DELETE /companies", function () {
	test("Deletes a company", async function () {
		const update = { name: "New Name", description: "new description!" };
		const response = await request(app).delete(`/companies/testcompany`);

		expect(response.statusCode).toEqual(200);
		expect(response.body).toEqual({ status: "deleted" });

		const updatedCompany = await db.query(
			`SELECT name, description, code
            FROM companies
            WHERE code = 'testcompany'`
		);

		expect(updatedCompany.rows[0]).toBeUndefined();
	});

	test("Throws an error when company not found", async function () {
		const update = { name: "New Name", description: "new description!" };
		const response = await request(app)
			.delete(`/companies/badcode`)
			.send(update);

		expect(response.statusCode).toEqual(404);
		expect(response.body.error).toEqual(`Company code 'badcode' not found.`);
	});
});
