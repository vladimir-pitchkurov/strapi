'use strict';

import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createContentAPIRequest } from 'api-tests/request';

const builder = createTestBuilder();

let strapi;
let data;
let rq;

const cat = (letter) => {
  return data.category.find((c) => c.name.toLowerCase().endsWith(letter));
};

const schemas = {
  contentTypes: {
    category: {
      attributes: {
        name: {
          type: 'string',
        },
      },
      displayName: 'Categories',
      singularName: 'category',
      pluralName: 'categories',
      description: '',
      collectionName: '',
    },
    article: {
      attributes: {
        title: {
          type: 'string',
        },
        categories: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::category.category',
        },
        primary: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::category.category',
        },
        relatedArticles: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::article.article',
        },
      },
      displayName: 'Article',
      singularName: 'article',
      pluralName: 'articles',
      description: '',
      collectionName: '',
    },
  },
};

const fixtures = {
  category: [
    {
      name: 'Category A',
      locale: 'en',
    },
    {
      name: 'Category C',
      locale: 'en',
    },
    {
      name: 'Category B',
      locale: 'en',
    },
    {
      name: 'Category D',
      locale: 'en',
    },
  ],
  articles(fixtures) {
    return [
      {
        title: 'Article A',
        locale: 'en',
        categories: fixtures.category
          .filter((cat) => cat.name.endsWith('B') || cat.name.endsWith('A'))
          .map((cat) => cat.id),
      },

      {
        title: 'Article C',
        locale: 'en',
        categories: fixtures.category
          .filter((cat) => cat.name.endsWith('D') || cat.name.endsWith('A'))
          .map((cat) => cat.id),
      },
      {
        title: 'Article D',
        locale: 'en',
        categories: fixtures.category.filter((cat) => cat.name.endsWith('B')).map((cat) => cat.id),
      },
      {
        title: 'Article B',
        locale: 'en',
        categories: fixtures.category.filter((cat) => cat.name.endsWith('A')).map((cat) => cat.id),
      },
    ];
  },
};

describe('Sort', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes(Object.values(schemas.contentTypes))
      .addFixtures(schemas.contentTypes.category.singularName, fixtures.category)
      .addFixtures(schemas.contentTypes.article.singularName, fixtures.articles)
      .build();

    strapi = await createStrapiInstance();
    rq = createContentAPIRequest({ strapi });
    data = await builder.sanitizedFixtures(strapi);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('by an attribute in a relation (all pages)', async () => {
    const pageSize = 3;

    const page1 = await rq.get(`/${schemas.contentTypes.article.pluralName}`, {
      qs: {
        sort: 'categories.id',
        populate: 'categories',
        pagination: {
          pageSize,
          page: 1,
        },
      },
    });
    const page2 = await rq.get(`/${schemas.contentTypes.article.pluralName}`, {
      qs: {
        sort: 'categories.id',
        populate: 'categories',
        pagination: {
          pageSize,
          page: 2,
        },
      },
    });

    expect(page1.status).toBe(200);
    expect(page1.body.data.length).toBe(3);
    expect(page2.status).toBe(200);
    expect(page2.body.data.length).toBe(1);

    const basicFields = {
      documentId: expect.any(String),
      locale: 'en',
      publishedAt: expect.anything(),
      updatedAt: expect.anything(),
    };

    // TODO: some dbs might not return categories data sorted by id, this should be arrayContaining+objectMatching
    expect(page1.body.data).toMatchObject([
      {
        id: 1,
        ...basicFields,
        title: 'Article A',
        categories: [cat('a'), cat('b')],
      },
      {
        id: 2,
        ...basicFields,
        title: 'Article C',
        categories: [cat('a'), cat('d')],
      },
      {
        id: 4,
        ...basicFields,
        title: 'Article B',
        categories: [cat('a')],
      },
    ]);
    expect(page2.body.data).toMatchObject([
      {
        id: 3,
        ...basicFields,
        title: 'Article D',
        categories: [cat('b')],
      },
    ]);

    expect(page1.body.meta).toMatchObject({
      pagination: {
        page: 1,
        pageSize,
        pageCount: 2,
        total: 4,
      },
    });
    expect(page2.body.meta).toMatchObject({
      pagination: {
        page: 2,
        pageSize,
        pageCount: 2,
        total: 4,
      },
    });
  });

  test('by an attribute in a relation (all results in one page)', async () => {
    const page = 1;
    const pageSize = 100;

    const { status, body } = await rq.get(`/${schemas.contentTypes.article.pluralName}`, {
      qs: {
        sort: 'categories.id',
        populate: 'categories',
        pagination: {
          page,
          pageSize,
        },
      },
    });

    expect(status).toBe(200);
    expect(body.data.length).toBe(4);

    const basicFields = {
      documentId: expect.any(String),
      publishedAt: expect.anything(),
      updatedAt: expect.anything(),
    };
    // TODO: some dbs might not return categories data sorted by id, this should be arrayContaining+objectMatching
    expect(body.data).toMatchObject([
      {
        id: 1,
        ...basicFields,
        title: 'Article A',
        categories: [cat('a'), cat('b')],
      },
      {
        id: 2,
        ...basicFields,
        title: 'Article C',
        categories: [cat('a'), cat('d')],
      },
      {
        id: 4,
        ...basicFields,
        title: 'Article B',
        categories: [cat('a')],
      },
      {
        id: 3,
        ...basicFields,
        title: 'Article D',
        categories: [cat('b')],
      },
    ]);

    expect(body.meta).toMatchObject({
      pagination: {
        page,
        pageSize,
        pageCount: 1,
        total: 4,
      },
    });
  });
});
