/* eslint-disable camelcase */
/* eslint-disable no-unused-vars */
require("dotenv").config();
const { Op } = require("sequelize");
const axios = require("axios");
const sequelize = require("../config/database/connection");
const config = require("../helpers/config");
const { Service } = require("../helpers/paystack");
const BankDetail = require("../models/BankDetail");

const { PAYSTACK_BASEURL } = process.env;

exports.getBanks = async (req, res, next) => {
  try {
    const response = await axios.get(`${PAYSTACK_BASEURL}/bank`, {
      headers: config.header
    });
    if (response.status) {
      return res.status(200).json({
        success: true,
        message: response.data.message,
        data: response.data.data
      });
    }
    return res.status(500).json({
      success: false,
      message: "Something went wrong!"
    });
  } catch (error) {
    return next(error);
  }
};

exports.saveBankDetail = async (req, res, next) => {
  sequelize.transaction(async t => {
    try {
      const { bank_name, account_number, account_name, bank_code } = req.body;
      const userId = req.user.id;
      const response = await Service.Paystack.verifyAccountNumber(
        account_number,
        bank_code
      );
      if (!response.status) {
        return res.status(400).json({
          success: false,
          message: "Account not valid"
        });
      }
      const data = {
        userId,
        bank_code,
        bank_name,
        account_name,
        account_number
      };
      const bankData = await BankDetail.findOne({ where: { userId } });
      if (bankData) {
        await BankDetail.update(data, { where: { userId }, transaction: t });
      } else {
        await BankDetail.create(data, { transaction: t });
      }
      return res.status(201).send({
        success: true,
        message: "Bank Detail saved successfully"
      });
    } catch (error) {
      t.rollback(next);
      return next(error);
    }
  });
};