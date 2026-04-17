import "./NegotiationItem.scss";
// Same two-column detail layout as conflict explorer event / peace node cards (EventsCard)
import "../ConflictExplorer/components/EventsCard/EventsCard.scss";
import React from "react";
//External Library
import { useTable, useExpanded, useSortBy } from "react-table";
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io";
//MUI
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
//Helper
import { getAgreementText, getDateString } from "../../helper/formatUtils";
import useDeviceCheck from '../../hooks/useDeviceCheck';

import styles from "../../styles/global.scss";

const labelSx = { mx: "10px", color: styles.textMedium };
const valueSx = { mx: "10px", color: styles.textMedium };

function NegotiationDetailRow({ label, children, boldValue }) {
  return (
    <div className="events-line">
      <Typography component="div" fontSize="16px" lineHeight="28px" sx={labelSx}>
        {label}
      </Typography>
      <Typography
        component="div"
        fontSize="16px"
        sx={{ ...valueSx, ...(boldValue ? { fontWeight: "bold" } : {}) }}
      >
        {children}
      </Typography>
    </div>
  );
}

function formatAgreementOutcomes(report) {
  const yn = (v) => (v === 1 || v === true ? "Yes" : "No");
  return `Agreement: ${yn(report?.agreement)} | Peace Agreement: ${yn(report?.peace_agreement)} | Ceasefire: ${yn(report?.ceasefire)}`;
}

function NegotiationExpandedDetails({ report, hideMediationInExpanded, repeatSummaryFields }) {
  const startStr = getDateString(
    report.start_year,
    report.start_month,
    report.start_day,
    report.precision_date
  );
  const endStr = getDateString(
    report.end_year,
    report.end_month,
    report.end_day,
    report.precision_date
  );
  const dateRange =
    endStr && endStr !== "----" && startStr !== endStr
      ? `${startStr} – ${endStr}`
      : startStr;
  const locationSummary =
    [report?.city, report?.town_name].filter(Boolean).join(", ") || "----";

  const thirdPartyLine =
    report?.third_party &&
    String(report.third_party).trim().length > 0
      ? report.third_party_short
        ? `${report.third_party} (${report.third_party_short})`
        : String(report.third_party)
      : null;

  return (
    <div className="events-all-info">
      {repeatSummaryFields ? (
        <>
          <div className="events-info notes">
            <div className="events-info-group">
              <NegotiationDetailRow label="ID">{report.negotiation_id || "—"}</NegotiationDetailRow>
              <NegotiationDetailRow label="Start date">{startStr}</NegotiationDetailRow>
              <NegotiationDetailRow label="End date">{endStr && endStr !== "----" ? endStr : "—"}</NegotiationDetailRow>
              <NegotiationDetailRow label="Location of negotiations">{locationSummary}</NegotiationDetailRow>
              <NegotiationDetailRow label="Agreement type">{getAgreementText(report)}</NegotiationDetailRow>
              {!hideMediationInExpanded ? (
                <NegotiationDetailRow label="Mediation">
                  {report.mediated_negotiations ? "Yes" : "No"}
                </NegotiationDetailRow>
              ) : null}
            </div>
          </div>
          <Divider />
        </>
      ) : null}

      {report?.description ? (
        <>
          <div className="events-info notes">
            <div className="events-info-group">
              <NegotiationDetailRow label="Description" boldValue>
                {report.description}
              </NegotiationDetailRow>
            </div>
          </div>
          <Divider />
        </>
      ) : null}

      <div className="events-info actor">
        <div className="events-info-group">
          {thirdPartyLine ? (
            <NegotiationDetailRow label="Third party">{thirdPartyLine}</NegotiationDetailRow>
          ) : null}
          <NegotiationDetailRow label="Agreement / ceasefire">{formatAgreementOutcomes(report)}</NegotiationDetailRow>
        </div>
      </div>

      <Divider />
      <div className="events-info location">
        <div className="events-info-group">
          <NegotiationDetailRow label="Location">
            {report?.city || "—"}
            {report?.town_name && report.town_name !== "unknown"
              ? `, ${report.town_name}`
              : ""}
          </NegotiationDetailRow>
          {report?.location_negotiations ? (
            <NegotiationDetailRow label="Location negotiations">
              {report.location_negotiations}
            </NegotiationDetailRow>
          ) : null}
        </div>
      </div>

      <Divider />
      <div className="events-info time">
        <div className="events-info-group">
          <NegotiationDetailRow label="Negotiation date">{dateRange}</NegotiationDetailRow>
        </div>
      </div>
    </div>
  );
}

const ExpandableTable = ({ peaceData, columns, hideMediationInExpanded = false }) => {
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable({ columns, data: peaceData || [] }, useSortBy, useExpanded);

  const detailColSpan = (columns?.length ?? 0) + 1;

    const { isMobile } = useDeviceCheck();

  return (
    <Box className={`${isMobile ? "mob-landview ": ""}table-container`}>
      <table {...getTableProps()} className="dyad-table-wrapper">
        <thead
          style={{ position: "sticky", top: 0, zIndex: 1 }}
          className="dyad-table-header-wrapper "
        >
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th
                  {...column.getHeaderProps(
                    column.getSortByToggleProps({ title: undefined })

                  )}
                  className="tableHead"
                >
                  <Stack
                    direction="row"
                    sx={{ alignItems: "center", gap: "8px" }}
                  >
                    {column.render("Header")}
                    {["ID", "Start", "End"].includes(column.Header) && (
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <IoIosArrowUp
                          size={12}
                          style={{
                            opacity:
                              column.isSorted && !column.isSortedDesc ? 1 : 0.5,
                            color:
                              column.isSorted && !column.isSortedDesc
                                ? "blue"
                                : "gray",
                          }}
                        />
                        <IoIosArrowDown
                          size={12}
                          style={{
                            opacity:
                              column.isSorted && column.isSortedDesc ? 1 : 0.5,
                            color:
                              column.isSorted && column.isSortedDesc
                                ? "blue"
                                : "gray",
                          }}
                        />
                      </Box>
                    )}
                  </Stack>
                </th>
              ))}
              <th
               
              ></th>
            </tr>
          ))}
        </thead>

        <tbody {...getTableBodyProps()}>
          {rows.map((row) => {
            prepareRow(row);
            return (
              <React.Fragment key={row.id}>
                <tr
                  {...row.getRowProps()}
                  onClick={() => row.toggleRowExpanded()}
                >
                  {row.cells.map((cell) => (
                    <td
                      {...cell.getCellProps()}
                     
                    >
                      <Typography
                        color={styles.textMedium}
                        fontSize={styles.fontText}
                        fontWeight="500"
                      >
                        {cell.render("Cell")}
                      </Typography>
                    </td>
                  ))}
                  <td
                    style={{
                      padding: "18px 20px 17px 10px",
                      borderTop: "1px solid #f3f3f3",
                      cursor: "pointer",
                    }}
                  >
                    {row.isExpanded ? <ExpandLess /> : <ExpandMore />}
                  </td>
                </tr>
                {row.isExpanded && (
                  <tr className="tableRow negotiation-expanded-row">
                    <td colSpan={detailColSpan} style={{ padding: 0, verticalAlign: "top", borderTop: "none" }}>
                      <NegotiationExpandedDetails
                        report={row.original}
                        hideMediationInExpanded={hideMediationInExpanded}
                        repeatSummaryFields={columns.length <= 2}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </Box>
  );
};

export default ExpandableTable;

