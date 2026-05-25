const express = require("express");
const router  = express.Router();

const Event = require("../models/event");
const auth  = require("../middleware/auth");

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isHttpUrl(value) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// fetch events
router.get("/", async (req, res) => {

  try {

    const {
      name,
      search,
      category,
      minPrice,
      maxPrice,
      status,
      startFrom,
      startTo,
      page,
      limit,
      sort = "startDate",
      order = "asc",
    } = req.query;
    const filters = {};
    const nameFilter = String(name || search || "").trim();
    const categoryFilter = String(category || "").trim();

    if (nameFilter) {
      const safeNameFilter = escapeRegex(nameFilter.slice(0, 80));
      filters.name = {
        $regex: safeNameFilter,
        $options: "i",
      };
    }

    if (categoryFilter) {
      const safeCategoryFilter = escapeRegex(categoryFilter.slice(0, 80));
      filters.category = {
        $regex: `^${safeCategoryFilter}$`,
        $options: "i",
      };
    }

    const priceFilter = {};
    const parsedMinPrice = Number(minPrice);
    const parsedMaxPrice = Number(maxPrice);

    if (minPrice !== undefined && Number.isFinite(parsedMinPrice)) {
      priceFilter.$gte = parsedMinPrice;
    }

    if (maxPrice !== undefined && Number.isFinite(parsedMaxPrice)) {
      priceFilter.$lte = parsedMaxPrice;
    }

    if (Object.keys(priceFilter).length) {
      filters.price = priceFilter;
    }

    if (status) {
      filters.status = String(status).trim();
    }

    const dateFilter = {};
    const parsedStartFrom = new Date(startFrom);
    const parsedStartTo = new Date(startTo);

    if (startFrom !== undefined && !Number.isNaN(parsedStartFrom.getTime())) {
      dateFilter.$gte = parsedStartFrom;
    }

    if (startTo !== undefined && !Number.isNaN(parsedStartTo.getTime())) {
      dateFilter.$lte = parsedStartTo;
    }

    if (Object.keys(dateFilter).length) {
      filters.startDate = dateFilter;
    }

    const sortMap = {
      name: "name",
      price: "price",
      date: "startDate",
      startDate: "startDate",
      created: "_id",
    };
    const sortField = sortMap[sort] || "startDate";
    const sortDirection = order === "desc" ? -1 : 1;
    const query = Event.find(filters).sort({ [sortField]: sortDirection, _id: 1 });

    const parsedPage = Number(page);
    const parsedLimit = Number(limit);
    const shouldPaginate =
      Number.isInteger(parsedPage) ||
      Number.isInteger(parsedLimit);

    if (shouldPaginate) {
      const safePage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
      const safeLimit =
        Number.isInteger(parsedLimit) && parsedLimit > 0
          ? Math.min(parsedLimit, 50)
          : 12;

      const [events, total] = await Promise.all([
        query.skip((safePage - 1) * safeLimit).limit(safeLimit),
        Event.countDocuments(filters),
      ]);

      return res.json({
        data: events,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          pages: Math.ceil(total / safeLimit),
        },
      });
    }

    const events = await query;

    res.json(events);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

// fetch single event
router.get("/:id", async (req, res) => {

  try {

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: "Event not found"
      });
    }

    res.json(event);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

// create event (admin only)
router.post("/", auth, async (req, res) => {

  try {

    if (!req.user.isAdmin) {
      return res.status(403).json({
        message: "Admins only"
      });
    }

    const {
      name,
      category,
      venue,
      locationUrl,
      image,
      seats,
      price,
      available,
      startDate,
      status,
    } = req.body;

    if (!image || !String(image).startsWith("data:image/")) {
      return res.status(400).json({
        message: "Event image is required"
      });
    }

    if (!isHttpUrl(locationUrl)) {
      return res.status(400).json({
        message: "Location link must be a valid http or https URL"
      });
    }

    const event = new Event({
      name,
      category,
      venue,
      locationUrl,
      image,
      seats,
      price,
      available,
      startDate,
      status,
    });

    await event.save();

    res.status(201).json(event);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

// edit event
router.put("/:id", auth, async (req, res) => {

  try {

    if (!req.user.isAdmin) {
      return res.status(403).json({
        message: "Admins only"
      });
    }

    if (req.body.image && !String(req.body.image).startsWith("data:image/")) {
      return res.status(400).json({
        message: "Event image must be a valid image upload"
      });
    }

    if (!isHttpUrl(req.body.locationUrl)) {
      return res.status(400).json({
        message: "Location link must be a valid http or https URL"
      });
    }

    const blockedUpdates = new Set(["_id", "__v", "id"]);
    const updates = {};

    for (const field of Object.keys(req.body)) {
      if (!blockedUpdates.has(field)) {
        updates[field] = req.body[field];
      }
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        message: "Event not found"
      });
    }

    Object.assign(event, updates);
    await event.save();

    res.json(event);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

// delete event
router.delete("/:id", auth, async (req, res) => {

  try {

    if (!req.user.isAdmin) {
      return res.status(403).json({
        message: "Admins only"
      });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: "Event not found"
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({
      message: "Event deleted"
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

module.exports = router;
