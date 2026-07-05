export type ChainableMock = {
  from: jest.Mock;
  $dynamic: jest.Mock;
  innerJoin: jest.Mock;
  leftJoin: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  offset: jest.Mock;
  values: jest.Mock;
  set: jest.Mock;
  returning: jest.Mock;
  then: jest.Mock;
};

type ChainableMockOptions = {
  postgresErrorCode?: string;
};

function createPostgresError(code: string): Error & { code: string } {
  return Object.assign(new Error(`Postgres error ${code}`), { code });
}

export function createChainableMock(
  resolvedValue: unknown,
  options: ChainableMockOptions = {},
): ChainableMock {
  const chain = {} as ChainableMock;

  const selfReturnMethods = [
    'from',
    '$dynamic',
    'innerJoin',
    'leftJoin',
    'where',
    'orderBy',
    'limit',
    'offset',
    'values',
    'set',
    'returning',
  ] as const;

  for (const method of selfReturnMethods) {
    chain[method] = jest.fn().mockReturnValue(chain);
  }

  if (options.postgresErrorCode) {
    const error = createPostgresError(options.postgresErrorCode);
    chain.then = jest.fn((onFulfilled, onRejected) =>
      Promise.reject(error).then(onFulfilled, onRejected),
    );
  } else {
    chain.then = jest.fn((onFulfilled, onRejected) =>
      Promise.resolve(resolvedValue).then(onFulfilled, onRejected),
    );
  }

  return chain;
}
