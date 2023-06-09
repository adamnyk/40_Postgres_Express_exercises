const express = require("express");
const ExpressError = require("../expressError");
const db = require("../db");

const router = new express.Router();

router.get("/", async (req, res, next) => {
	try {
		const results = await db.query(`SELECT id, comp_code FROM invoices`);

		return res.json({ invoices: results.rows });
	} catch (error) {
		return next(error);
	}
});

router.get("/:id", async (req, res, next) => {
	try {
		const invResults = await db.query(
			`SELECT id, amt, paid, add_date, paid_date, comp_code
            FROM invoices
            WHERE id = $1`,
			[req.params.id]
		);

		if (invResults.rows.length === 0) {
			throw new ExpressError(
				`Invoice with ID: ${req.params.id} not found.`,
				404
			);
		}

		const invoice = invResults.rows[0];
		const { comp_code } = invoice;
		delete invoice.comp_code;

		const compResults = await db.query(
			`SELECT code, name, description
			FROM companies 
			WHERE code = '${comp_code}'`
		);

		console.log(compResults.rows);

		const company = compResults.rows[0];
		invoice.company = company;

		return res.json({ invoice });
	} catch (error) {
		return next(error);
	}
});

router.post("/", async (req, res, next) => {
	try {
		const { comp_code, amt } = req.body;
		const results = await db.query(
			`INSERT INTO invoices (comp_code, amt) 
            VALUES ($1, $2)
            RETURNING id, comp_code, amt, paid, add_date, paid_date`,
			[comp_code, amt]
		);

		return res.status(201).json({ invoice: results.rows[0] });
	} catch (error) {
		return next(error);
	}
});

router.put("/:id", async (req, res, next) => {
	try {
		let { amt, paid } = req.body;
		let paidDate = null;

		if (paid && paid != "true" && paid != "false") {
			throw new ExpressError(`Paid must be 'true' or 'false'`, 400);
		}

		const currentInv = await db.query(
			`SELECT id, amt, paid, add_date, paid_date, comp_code
            FROM invoices
            WHERE id = $1`,
			[req.params.id]
		);

		if (!currentInv.rows.length) {
			throw new ExpressError(
				`Invoice with ID:${req.params.id} not found.`,
				404
			);
		}

		if (!amt) amt = currentInv.rows[0].amt;
		if (!paid) paid = false;

		const currentPaidDate = currentInv.rows[0].paid_date;
		if (!currentPaidDate && paid == "true") {
			paidDate = new Date();
		} else if (paid == "false") {
			paidDate = null;
		} else {
			paidDate = currentInv.rows[0].paid_date;
		}

		const results = await db.query(
			`UPDATE invoices SET amt=$1, paid=$2, paid_date=$3
            WHERE id = $4
            RETURNING id, comp_code, amt, paid, add_date, paid_date`,
			[amt, paid, paidDate, req.params.id]
		);

		return res.json({ invoice: results.rows[0] });
	} catch (error) {
		return next(error);
	}
});

router.delete("/:id", async (req, res, next) => {
	try {
		const results = await db.query(
			`DELETE FROM invoices 
            WHERE id =$1
            RETURNING id`,
			[req.params.id]
		);

		if (!results.rows.length) return next();

		return res.json({ status: "deleted" });
	} catch (error) {
		return next(error);
	}
});

module.exports = router;
