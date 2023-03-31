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
		const results = await db.query(
			`SELECT 
            i.id, 
            i.amt, 
            i.paid, 
            i.add_date, 
            i.paid_date,
            c.code,
            c.name,
            c.description
            FROM invoices AS i
            JOIN companies AS c
                ON (i.comp_code = c.code)
            WHERE i.id = $1
            `,
			[req.params.id]
		);

		if (!results.rows.length) {
			throw new ExpressError(`No such invoice: ${id}`, 404);
		}

		const { code, name, description, ...rest } = results.rows[0];
		const invoice = {
			...rest,
			company: {
				code,
				name,
				description,
			},
		};

		return res.json({invoice});
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
		const { amt } = req.body;

		const results = await db.query(
			`UPDATE invoices SET amt=$1
            WHERE id = $2
            RETURNING id, comp_code, amt, paid, add_date, paid_date`,
			[amt, req.params.id]
		);

		if (!results.rows.length) return next();

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
