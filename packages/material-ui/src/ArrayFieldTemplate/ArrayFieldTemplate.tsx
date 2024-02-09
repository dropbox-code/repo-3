import React, {useEffect, useState} from 'react';
import { useIntl } from 'react-intl';

import { utils } from '@visma/rjsf-core';

import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';

import { ArrayFieldTemplateProps, IdSchema } from '@visma/rjsf-core';

import AddButton from '../AddButton/AddButton';
import IconButton from '../IconButton/IconButton';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import { JSONSchema7 } from 'json-schema';
import Button from "@material-ui/core/Button";

const {
  isMultiSelect,
  getDefaultRegistry,
} = utils;

const indentation = (element: any) => {
  return element.indent;
}

type ArrayFieldTitleProps = {
  TitleField: any;
  idSchema: IdSchema;
  title: string;
  required: boolean;
  schema: JSONSchema7;
};

const ArrayFieldTitle = ({
                           schema,
                           idSchema,
                           title,
                           required
                         }: ArrayFieldTitleProps) => {
  if (!title) {
    return null;
  }

  const headerNumber = idSchema.$id.split('_').length + 1;
  const id = `${idSchema.$id}__title`;
  // return <TitleField id={id} title={title} required={required} />;
  return (
    <Box id={id} mb={1} mt={1}>
      <Typography
        {
          ...(schema.items && (schema.items as JSONSchema7).type === 'object')
            ?
            {
              component: headerNumber === 2 ? "h2" : "h3",
            }
            :
            {
              component: "p",
              'aria-hidden': true
            }
        }
        variant="subtitle1">
        {title}
        { required && <> *</> }
      </Typography>
      <Divider />
    </Box>
  );
};

type ArrayFieldDescriptionProps = {
  idSchema: IdSchema;
  description: string;
};

const ArrayFieldDescription = ({
                                 idSchema,
                                 description,
                               }: ArrayFieldDescriptionProps) => {
  if (!description) {
    return null;
  }

  const id = utils.descriptionId(idSchema.$id);
  //return <DescriptionField id={id} description={description} />;
  return <Typography component="p" variant="subtitle2" id={id}>{description}</Typography>
};

// Used in the two templates
const DefaultArrayItem = (props: any) => {
  const btnStyle = {
    flex: 1,
    paddingLeft: 3,
    paddingRight: 3,
    fontWeight: 'bold',
    minWidth: 0,
    marginLeft: 5,
    marginBottom: 10,
    borderRadius: 15,
    borderWidth: 2
  };
  const intl = useIntl();
  return (
    <Grid container={true} key={props.key} alignItems="center">
      {props.extraOptions && (
        <Grid container style={{justifyContent: "flex-end"}}>
          <Grid item={true}>
            <Box mb={2}>
              <AddButton
                className="array-item-add"
                onClick={props.onAddIndexClick(props.index)}
                disabled={props.disabled || props.readonly}
              />
            </Box>
          </Grid>
        </Grid>
      )}
      <Grid
        item={true}
        xs
        // Causes datepicker popover to be shown only partially
        // style={{ overflow: "auto" }}
      >
        <Box mb={2}>
          <Paper elevation={2}>
            <Box p={2}>{props.children}</Box>
          </Paper>
        </Box>
      </Grid>

      {props.hasToolbar && (
        <Grid item>
          <Grid container direction="column">
            {(props.hasMoveUp || props.hasMoveDown) && props.extraOptions && (
              <IconButton
                icon="double-arrow-up"
                className="array-item-move-up"
                aria-label={intl.formatMessage({defaultMessage: 'Move first'})}
                //tabIndex={-1}
                style={btnStyle as any}
                iconProps={{ fontSize: 'small' }}
                disabled={props.disabled || props.readonly || !props.hasMoveUp}
                onClick={props.onReorderClick(props.index, 0)}
              />
            )}

            {(props.hasMoveUp || props.hasMoveDown) && (
              <>
                <IconButton
                  icon="arrow-up"
                  className="array-item-move-up"
                  aria-label={intl.formatMessage({defaultMessage: 'Move up'})}
                  //tabIndex={-1}
                  style={btnStyle as any}
                  iconProps={{ fontSize: 'small' }}
                  disabled={props.disabled || props.readonly || !props.hasMoveUp}
                  onClick={props.onReorderClick(props.index, props.index - 1)}
                />
                <IconButton
                  icon="arrow-down"
                  aria-label={intl.formatMessage({defaultMessage: 'Move down'})}
                  //tabIndex={-1}
                  style={btnStyle as any}
                  iconProps={{ fontSize: 'small' }}
                  disabled={props.disabled || props.readonly || !props.hasMoveDown}
                  onClick={props.onReorderClick(props.index, props.index + 1)}
                />
              </>
            )}

            {(props.hasMoveUp || props.hasMoveDown) && props.extraOptions && (
              <IconButton
                icon="double-arrow-down"
                className="array-item-move-up"
                aria-label={intl.formatMessage({defaultMessage: 'Move last'})}
                //tabIndex={-1}
                style={btnStyle as any}
                iconProps={{ fontSize: 'small' }}
                disabled={props.disabled || props.readonly || !props.hasMoveDown}
                onClick={props.onReorderClick(props.index, props.size - 1)}
              />
            )}

            {props.hasRemove && (
              <IconButton
                icon="remove"
                aria-label={intl.formatMessage({defaultMessage: 'Remove item'})}
                //tabIndex={-1}
                style={btnStyle as any}
                iconProps={{ fontSize: 'small' }}
                disabled={props.disabled || props.readonly}
                onClick={props.onDropIndexClick(props.index)}
              />
            )}
          </Grid>
        </Grid>
      )}
    </Grid>
  );
};

const DefaultFixedArrayFieldTemplate = (props: ArrayFieldTemplateProps) => {
  return (
    <fieldset className={props.className}>
      <ArrayFieldTitle
        key={`array-field-title-${props.idSchema.$id}`}
        TitleField={props.TitleField}
        idSchema={props.idSchema}
        title={props.uiSchema['ui:title'] || props.title}
        required={props.required}
        schema={props.schema}
      />

      {(props.uiSchema['ui:description'] || props.schema.description) && (
        <ArrayFieldDescription
          key={`array-field-description-${props.idSchema.$id}`}
          idSchema={props.idSchema}
          description={
            props.uiSchema['ui:description'] || props.schema.description
          }
        />
      )}

      <div
        className="row array-item-list"
        key={`array-item-list-${props.idSchema.$id}`}
      >
        {props.items && props.items.map(p => DefaultArrayItem(
          {...p,
            size: props.items.length,
            hasRemove: props.items.length > (props.schema.minItems ? props.schema.minItems : 0) && p.hasRemove,
            extraOptions: (props.schema as any).extraListOptions}
        ))}
      </div>

      {props.canAdd && (
        <AddButton
          className="array-item-add"
          onClick={props.onAddClick}
          disabled={props.disabled || props.readonly}
        />
      )}
    </fieldset>
  );
};

const PaginationBar = (props: {currentPage: number, pageAmount: number, setPage: (page: number) => void}) => {
  const {currentPage, pageAmount, setPage} = props
  return (
    <>
      <Button size="large" style={{minWidth: 20, marginLeft: 20}} disabled={currentPage === 0} onClick={() => setPage(0)}>{'<<|'}</Button>
      <Button size="large" style={{minWidth: 20, marginLeft: 5}} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{'<|'}</Button>
      {Array.from({length: pageAmount}, (_, i) => i).map(i =>
        <Button size="large" style={{minWidth: 40, marginLeft: 5}} disabled={i === currentPage} onClick={() => setPage(i)}>{i + 1}</Button>
      )}
      <Button size="large" style={{minWidth: 20, marginLeft: 5}} disabled={currentPage === pageAmount -1} onClick={() => setPage(currentPage + 1)}>{'|>'}</Button>
      <Button size="large" style={{minWidth: 20, marginLeft: 5}} disabled={currentPage === pageAmount -1} onClick={() => setPage(pageAmount - 1)}>{'|>>'}</Button>
    </>
  );
}

const DefaultNormalArrayFieldTemplate = (props: ArrayFieldTemplateProps) => {
  const intl = useIntl();
  const paginated = (props.schema.items as {pagination?: boolean})!.pagination !== undefined ? (props.schema.items as {pagination?: boolean})!.pagination : false;
  //const elementsPerPage = paginated ? (props.schema.items as {elementsPerPage: number})!.elementsPerPage : -1;
  const [visibleItems, setVisibleItems] = useState([]);
  const [page, setPage] = useState(0);
  const [elementsPerPage, setElementsPerPage] = useState(5);
  const [scrollIntoView, setScrollIntoView] = useState(false);
  const [pageAmount, setPageAmount] = useState(
    paginated
      ? Math.ceil(props.items.length / elementsPerPage)
      : 1
  );

  useEffect(() => {
    if (visibleItems && visibleItems.length > 0 && scrollIntoView) {
      // @ts-ignore
      const firstElement = document.getElementById(props.idSchema.$id + '__title');
      firstElement!.focus();
      firstElement!.scrollIntoView({behavior: 'smooth'});
      setScrollIntoView(false);
    }
  }, [visibleItems]);

  useEffect(() => {
    if (page > -1) {
      // @ts-ignore
      setVisibleItems(props.items.slice(elementsPerPage * page, elementsPerPage * page + elementsPerPage));
    }
  }, [page, props.items, elementsPerPage]);

  useEffect(() => {
    setPageAmount(paginated
      ? Math.ceil(props.items.length / elementsPerPage)
      : 1)
  }, [props.items, elementsPerPage]);

  const handlePageChange = (pageNumber: number) => {
    setPage(pageNumber);
    setScrollIntoView(true);
  }

  return (
    <Paper elevation={2}>
      <Box p={2}>
        <ArrayFieldTitle
          key={`array-field-title-${props.idSchema.$id}`}
          TitleField={props.TitleField}
          idSchema={props.idSchema}
          title={props.uiSchema['ui:title'] || props.title}
          required={props.required}
          schema={props.schema}
        />

        {(props.uiSchema['ui:description'] || props.schema.description) && (
          <ArrayFieldDescription
            key={`array-field-description-${props.idSchema.$id}`}
            idSchema={props.idSchema}
            description={
              props.uiSchema['ui:description'] || props.schema.description
            }
          />
        )}

        {paginated && pageAmount > 1 && <PaginationBar currentPage={page} pageAmount={pageAmount} setPage={handlePageChange}/>}

        <Grid container={true} key={`array-item-list-${props.idSchema.$id}`}>
          {paginated && visibleItems && visibleItems.map(p => DefaultArrayItem(
            // @ts-ignore
            {...p,
              size: props.items.length,
              hasRemove: props.items.length > (props.schema.minItems ? props.schema.minItems : 0) && p.hasRemove,
              extraOptions: (props.schema as any).extraListOptions}
          ))}
          {!paginated && props.items && props.items.map(p => DefaultArrayItem(
            {...p,
              size: props.items.length,
              hasRemove: props.items.length > (props.schema.minItems ? props.schema.minItems : 0) && p.hasRemove,
              extraOptions: (props.schema as any).extraListOptions}
          ))}

          {props.canAdd && (
            <Grid container style={{justifyContent: "flex-end"}}>
              <Grid item={true}>
                <Box mt={2}>
                  <AddButton
                    className="array-item-add"
                    onClick={paginated && props.items.length > 0 ? () => {
                      setScrollIntoView(true);
                      props.items[0].onAddIndexClick((page+1)*elementsPerPage)()
                      setPage(page + 1);
                    } : props.onAddClick}
                    disabled={props.disabled || props.readonly}
                  />
                </Box>
              </Grid>
            </Grid>
          )}
        </Grid>
      </Box>
      {paginated && pageAmount > 1 && <PaginationBar currentPage={page} pageAmount={pageAmount} setPage={handlePageChange}/>}
      {paginated && <p style={{paddingLeft: 20, paddingBottom: 15}}>
        {intl.formatMessage({defaultMessage: 'Elements per page: '})}
        {[5, 10, 15].map(i => <Button size="small" style={{minWidth: 1, maxWidth: 30, borderRadius: 32, marginLeft: 5}} variant="outlined" disabled={i === elementsPerPage} onClick={() => setElementsPerPage(i)}>{i}</Button>)}
      </p>}
    </Paper>
  );
};

const ArrayFieldTemplate = (props: ArrayFieldTemplateProps) => {
  const { schema, registry = getDefaultRegistry(), uiSchema } = props;

  return(
    <Box pl={
      uiSchema.items && uiSchema.items!['ui:options']
      && indentation(uiSchema.items!['ui:options']!.element)
        ? 3 * indentation(uiSchema.items!['ui:options']!.element)
        : 0
    }>
      {
        isMultiSelect(schema, registry.rootSchema)
          ? <DefaultFixedArrayFieldTemplate {...props} />
          : <DefaultNormalArrayFieldTemplate {...props} />
      }
    </Box>
  );
};

export default ArrayFieldTemplate;
