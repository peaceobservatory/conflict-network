import { getAgreementText, getDateString ,createDateSortType } from '../../../helper/formatUtils'

/**
 * @param {boolean} isMobile
 * @param {{ omitMediationColumn?: boolean }} [options] — omitMediationColumn: hide Mediation yes/no (e.g. conflict explorer mediation links, where all rows are mediated)
 */
export const getColumns = (isMobile, options = {}) => {
  const { omitMediationColumn = false } = options;

  const idColumn = {
    Header: "ID",
    accessor: "negotiation_id",
    sortType: (rowA, rowB) => {
      const parseId = (id) => {
        const [main, sub] = id.split("-").map(Number);
        return { main, sub: sub || 0 };
      };
      const a = parseId(rowA.original.negotiation_id);
      const b = parseId(rowB.original.negotiation_id);

      return a.main === b.main ? a.sub - b.sub : a.main - b.main;
    },
  };

  const startColumn = {
    Header: 'Start',
    accessor: (row) => getDateString(row.start_year, row.start_month, row.start_day, row.precision_date),
    sortType: createDateSortType('start'),
  };

  if (isMobile) {
    return [idColumn, startColumn];
  }

  const desktopRest = [
    {
      Header: 'End',
      accessor: (row) => getDateString(row.end_year, row.end_month, row.end_day, row.precision_date),
      sortType: createDateSortType('end'),
    },
    {
      Header: 'Location of negotiations',
      accessor: (row) => [row.city, row.town_name].filter(Boolean).join(', ') || '----',
      disableSortBy: true,
    },
    ...(omitMediationColumn
      ? []
      : [
          {
            Header: 'Mediation',
            accessor: (row) => row.mediated_negotiations ? "yes" : "no",
            disableSortBy: true,
          },
        ]),
    {
      Header: 'Agreement type',
      accessor: (row) => getAgreementText(row) || '----',
      disableSortBy: true,
    },
  ];

  return [idColumn, startColumn, ...desktopRest];
};
