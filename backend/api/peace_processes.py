import os
import logging
import json

import pandas as pd
from fastapi import APIRouter, status
from config.specifications import (
    DATA_NOT_FOUND,
    INTERNAL_SERVER_ERROR_MSG,
    FATALITIES_FILE,
    NEGOTIATIONS_FILE,
    PP_THIRD_PARTY_SHORT_COL,
    PP_THIRD_PARTY_ID_COL,
    PP_MEDIATED_COL,
    PP_NEGOTIATION_ID_COL,
    PP_SIDE_A_COL,
    PP_SIDE_B_COL,
    PP_THIRD_PARTY_COL,
)
from utils.responses import success_response, error_response

router = APIRouter()
logger = logging.getLogger("conflict_network")
LIB_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(LIB_DIR, "data")

@router.get("/get-events-fatalities")
async def get_events_fatalities():
    """
    Get the number of events and fatalities for each country, indexed by its Gleditsch-Ward number.

    Args:
        None

    Returns:
        dict: {gw-number: {'events': int, 'fatalities': int, 'events_bin': int, 'fatalities_bin': int}}
    """
    try:
        with open(file=DATA_DIR+'/'+FATALITIES_FILE) as data_file:
            data = json.load(data_file)
            return success_response(
                data=data,
                message="Successfully retrieved event and fatality counts by country.",
                status_code=status.HTTP_200_OK,
            )
    except Exception as e:
        logger.error(f"Error Results:{e}")
        return error_response(
            message=INTERNAL_SERVER_ERROR_MSG,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
@router.get("/get-negotiations-agreements")
async def get_negotiations_agreements():
    """
    Get the number of negotiations and agreements for each country, indexed by its Gleditsch-Ward number.

    Args:
        None

    Returns:
        dict: {gw-number: {'negotiations': int, 'agreements': int, 'negotiations_bin': int, 'agreements_bin': int}}
    """
    try:
        with open(file=DATA_DIR+'/'+NEGOTIATIONS_FILE) as data_file:
            data = json.load(data_file)
            return success_response(
                data=data,
                message="Successfully retrieved negotiations_agreements.",
                status_code=status.HTTP_200_OK,
            )
    except Exception as e:
        logger.error(f"Error Results:{e}")
        return error_response(
            message=INTERNAL_SERVER_ERROR_MSG,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

# --- Internal Helpers ---
from config.specifications import FULL_PEACE_DATA

def get_full_peace_data():
    """
    Get and return the complete data for 'African Peace Processes'.
    """
    try:
        peace_data = pd.read_excel(os.path.join(DATA_DIR, 'peace_observatory.xlsx')).fillna(0)
        return peace_data
    except Exception as e:
        logger.error(f"Error loading full peace data: {e}")
        return None
        
def get_res_df(df):
    """
    Convert a data frames columns into a standardised data frame.
    """
    try:
        new_df = pd.DataFrame()
        new_df["negotiation_id"] = df["negotiation_id"]
        new_df["start_year"] = df["start_negotiations_year"]
        new_df["start_day"] = df["start_negotiations_day"]
        new_df["end_day"] = df["end_negotiations_day"]
        new_df["precision_date"]=df["precision_date"]
        new_df["start_month"] = df["start_negotiations_month"]
        new_df["end_year"] = df["end_negotiations_year"]
        new_df["end_month"] = df["end_negotiations_month"]
        new_df["location_negotiations"] = df["location_negotiations"]
        new_df["mediated_negotiations"] = df["mediated_negotiations"]
        new_df["agreement"] = df["agreement"]
        new_df["peace_agreement"] = df["peace_agreement"]
        new_df["ceasefire"] = df["ceasefire"]
        new_df["third_party"] = df["third_party"]
        new_df["third_party_short"] = df[PP_THIRD_PARTY_SHORT_COL] if PP_THIRD_PARTY_SHORT_COL in df.columns else ""
        new_df["third_party_id"] = df[PP_THIRD_PARTY_ID_COL] if PP_THIRD_PARTY_ID_COL in df.columns else ""
        new_df["description"] = df["description"]
        new_df["town_name"] = df["location_negotiations"]
        new_df["city"] = df["location_negotiations_country"]
        new_df.drop_duplicates(inplace=True)
        return new_df.to_dict(orient="records")
    except Exception as e:
        logger.error(f"Error Results:{e}")

def get_filtered_gw(gw_number, df):
    """
    Get and return the subset of data for 'African Peace Processes' whose conflict location is assigned to given GW number.
    """
    try:
        GW_COLUMN = 'gwno_loc_conflict' # from global_variables.py
        df_copy = df.copy()
        df_copy["found"] = df_copy[GW_COLUMN].apply(
            lambda entry_gwno: (str(gw_number) in str(entry_gwno).split(", "))
        )
        return df.loc[df_copy["found"] == True]
    except Exception as e:
        logger.error(f"Error filtering peace data: {e}")
        return None